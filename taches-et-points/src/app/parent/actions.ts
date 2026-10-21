"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  exitParentMode,
  hashPin,
  lockKiosk,
  requireParent,
  requireUnlocked,
} from "@/lib/auth/session";
import { CHILD_COLOR_KEYS, RECURRENCES, TASK_TYPES } from "@/lib/constants";
import { activeManagedPins, matchesPin } from "@/lib/auth/pins";
import { lockSpending, setProfileEditable, unlockSpending } from "@/lib/children";
import { announceDecision } from "@/lib/ha/events";
import { scheduleHaSync } from "@/lib/ha/sync";
import { recordTransaction } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";
import { resolveConversion, resolveRedemption } from "@/lib/rewards/service";
import { revokeCompletion, updateTask } from "@/lib/tasks/service";

export type FormState = { error?: string; success?: string };

/** Rafraîchit toutes les vues qui dépendent des données modifiées. */
function revalidateAll() {
  revalidatePath("/", "layout");
  // Tout changement de l'espace parents peut toucher un capteur de HA.
  scheduleHaSync();
}

// --- Enfants ---------------------------------------------------------------

const childSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(40),
  avatar: z.string().trim().min(1).max(8),
  color: z.enum(CHILD_COLOR_KEYS as [string, ...string[]]),
});

export async function saveChild(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireParent();

  const parsed = childSchema.safeParse({
    name: formData.get("name"),
    avatar: formData.get("avatar") || "🙂",
    color: formData.get("color"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const id = String(formData.get("id") ?? "");

  if (id) {
    const updated = await prisma.child.updateMany({
      where: { id },
      data: parsed.data,
    });
    if (updated.count === 0) return { error: "Cet enfant n'existe plus." };
  } else {
    const count = await prisma.child.count();
    await prisma.child.create({
      data: { ...parsed.data, sortOrder: count },
    });
  }

  revalidateAll();
  return { success: "Enregistré." };
}

/**
 * Désactive un enfant plutôt que de le supprimer: son historique de points
 * reste lisible, et rien ne casse dans le grand livre.
 */
export async function toggleChild(formData: FormData) {
  await requireParent();

  const id = String(formData.get("id") ?? "");
  const child = await prisma.child.findUnique({ where: { id } });
  if (!child) return;

  await prisma.child.update({
    where: { id },
    data: { active: !child.active },
  });

  revalidateAll();
}

// --- Tâches ----------------------------------------------------------------

const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Le titre est requis.").max(80),
    description: z.string().trim().max(200).optional(),
    icon: z.string().trim().min(1).max(30),
    type: z.enum(TASK_TYPES as unknown as [string, ...string[]]),
    pointsValue: z.coerce
      .number()
      .int("Les points doivent être un nombre entier.")
      .min(1, "Au moins 1 point.")
      .max(1000),
    recurrence: z.enum(RECURRENCES as unknown as [string, ...string[]]),
    weekdays: z.string().optional(),
    assignedChildId: z.string().optional(),
  })
  .refine(
    (data) => data.type !== "INDIVIDUAL" || Boolean(data.assignedChildId),
    { message: "Choisissez à qui la tâche est assignée." },
  )
  .refine(
    (data) => data.recurrence !== "WEEKDAYS" || Boolean(data.weekdays),
    { message: "Choisissez au moins un jour." },
  );

export async function saveTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireParent();

  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || "star",
    type: formData.get("type"),
    pointsValue: formData.get("pointsValue"),
    recurrence: formData.get("recurrence"),
    weekdays: formData.getAll("weekdays").join(",") || undefined,
    assignedChildId: formData.get("assignedChildId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const data = {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    icon: parsed.data.icon,
    type: parsed.data.type,
    pointsValue: parsed.data.pointsValue,
    recurrence: parsed.data.recurrence,
    // Ces deux champs n'ont de sens que pour certaines combinaisons: on les
    // remet à null sinon, pour qu'un ancien réglage ne traîne pas en base.
    weekdays:
      parsed.data.recurrence === "WEEKDAYS"
        ? (parsed.data.weekdays ?? null)
        : null,
    assignedChildId:
      parsed.data.type === "INDIVIDUAL"
        ? (parsed.data.assignedChildId ?? null)
        : null,
  };

  const id = String(formData.get("id") ?? "");

  if (id) {
    // La clé d'occurrence dérive de la récurrence: si elle change, les
    // complétions déjà enregistrées suivent, dans la même transaction.
    if (!(await updateTask(id, data))) {
      return { error: "Cette tâche n'existe plus." };
    }
  } else {
    const count = await prisma.task.count();
    await prisma.task.create({ data: { ...data, sortOrder: count } });
  }

  revalidateAll();
  redirect("/parent/taches");
}

export async function toggleTask(formData: FormData) {
  await requireParent();

  const id = String(formData.get("id") ?? "");
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;

  await prisma.task.update({ where: { id }, data: { active: !task.active } });
  revalidateAll();
}

export async function deleteTask(formData: FormData) {
  await requireParent();

  // deleteMany plutôt que delete: une double soumission ou un identifiant
  // périmé ne doit pas faire tomber la page sur une erreur Prisma.
  const id = String(formData.get("id") ?? "");
  await prisma.task.deleteMany({ where: { id } });

  revalidateAll();
}

/** Annule une confirmation de tâche (l'occurrence redevient disponible). */
export async function undoCompletion(formData: FormData) {
  await requireParent();

  const id = String(formData.get("id") ?? "");
  await revokeCompletion(id);

  revalidateAll();
}

// --- Récompenses -----------------------------------------------------------

const rewardSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(80),
  description: z.string().trim().max(200).optional(),
  icon: z.string().trim().min(1).max(30),
  costPoints: z.coerce
    .number()
    .int("Le coût doit être un nombre entier.")
    .min(1, "Au moins 1 point.")
    .max(100000),
});

export async function saveReward(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireParent();

  const parsed = rewardSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || "gift",
    costPoints: formData.get("costPoints"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const data = {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    icon: parsed.data.icon,
    costPoints: parsed.data.costPoints,
  };

  const id = String(formData.get("id") ?? "");

  if (id) {
    const updated = await prisma.reward.updateMany({ where: { id }, data });
    if (updated.count === 0) {
      return { error: "Cette récompense n'existe plus." };
    }
    revalidateAll();
    redirect("/parent/recompenses");
  } else {
    const count = await prisma.reward.count();
    await prisma.reward.create({ data: { ...data, sortOrder: count } });
  }

  revalidateAll();
  return { success: "Enregistré." };
}

export async function toggleReward(formData: FormData) {
  await requireParent();

  const id = String(formData.get("id") ?? "");
  const reward = await prisma.reward.findUnique({ where: { id } });
  if (!reward) return;

  await prisma.reward.update({
    where: { id },
    data: { active: !reward.active },
  });

  revalidateAll();
}

// --- Approbations ----------------------------------------------------------

export async function decideRedemption(formData: FormData) {
  await requireParent();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (decision !== "FULFILLED" && decision !== "REJECTED") return;

  if (await resolveRedemption(id, decision)) {
    void announceDecision("recompense", id, decision === "FULFILLED", "app");
  }
  revalidateAll();
}

export async function decideConversion(formData: FormData) {
  await requireParent();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (decision !== "PAID" && decision !== "REJECTED") return;

  if (await resolveConversion(id, decision)) {
    void announceDecision("argent", id, decision === "PAID", "app");
  }
  revalidateAll();
}

// --- Ajustement manuel -----------------------------------------------------

const adjustSchema = z.object({
  childId: z.string().min(1),
  points: z.coerce
    .number()
    .int("Utilisez un nombre entier.")
    .refine((value) => value !== 0, "La valeur ne peut pas être zéro."),
  reason: z.string().trim().min(1, "Indiquez une raison.").max(120),
});

/** Crédit ou débit manuel, toujours tracé dans le grand livre. */
export async function adjustPoints(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireParent();

  const parsed = adjustSchema.safeParse({
    childId: formData.get("childId"),
    points: formData.get("points"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  await recordTransaction(prisma, {
    childId: parsed.data.childId,
    type: "MANUAL_ADJUST",
    points: parsed.data.points,
    source: "MANUAL",
    description: parsed.data.reason,
    createdBy: "PARENT",
  });

  revalidateAll();
  return { success: "Ajustement enregistré." };
}

// --- Réglages --------------------------------------------------------------

const settingsSchema = z.object({
  pointsPerDollar: z.coerce
    .number()
    .int("Utilisez un nombre entier.")
    .min(1, "Au moins 1 point par dollar.")
    .max(100000),
  accessPin: z
    .string()
    .regex(/^\d{4,8}$/, "Le NIP doit contenir de 4 à 8 chiffres.")
    .optional()
    .or(z.literal("")),
  parentPin: z
    .string()
    .regex(/^\d{4,8}$/, "Le NIP doit contenir de 4 à 8 chiffres.")
    .optional()
    .or(z.literal("")),
});

export async function saveSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireParent();

  const parsed = settingsSchema.safeParse({
    pointsPerDollar: formData.get("pointsPerDollar"),
    accessPin: formData.get("accessPin") ?? "",
    parentPin: formData.get("parentPin") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!settings) return { error: "Application non configurée." };

  // Les deux NIP doivent rester différents, sinon les enfants entrent dans
  // l'espace parents. Quand un seul des deux change, on le compare au hash de
  // l'autre — c'est la seule façon de tester l'égalité sans stocker de clair.
  // Un NIP imposé par Home Assistant ne se change pas ici, même par un POST
  // direct qui contournerait le formulaire.
  const managed = await activeManagedPins(settings);
  const newAccess = managed.access ? "" : (parsed.data.accessPin ?? "");
  const newParent = managed.parent ? "" : (parsed.data.parentPin ?? "");

  let collides = Boolean(newAccess && newParent && newAccess === newParent);
  if (!collides && newAccess && !newParent) {
    collides = await matchesPin("parent", newAccess, settings);
  }
  if (!collides && newParent && !newAccess) {
    collides = await matchesPin("access", newParent, settings);
  }

  if (collides) {
    return {
      error: "Le NIP d'entrée et le NIP parent doivent être différents.",
    };
  }

  // Un champ NIP laissé vide veut dire « ne change pas ce NIP ».
  await prisma.appSettings.update({
    where: { id: 1 },
    data: {
      pointsPerDollar: parsed.data.pointsPerDollar,
      ...(newAccess ? { accessPinHash: await hashPin(newAccess) } : {}),
      ...(newParent ? { parentPinHash: await hashPin(newParent) } : {}),
    },
  });

  revalidateAll();
  return { success: "Réglages enregistrés." };
}

// --- Session ---------------------------------------------------------------

export async function leaveParentMode() {
  // Comme toute Server Action, celle-ci est joignable par POST direct: sans ce
  // contrôle, l'appeler suffirait à obtenir une session.
  await requireUnlocked();
  await exitParentMode();
  redirect("/");
}

export async function logout() {
  await lockKiosk();
  redirect("/login");
}

// --- Boutique bloquée --------------------------------------------------------

export async function lockChildSpending(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireParent();

  const ok = await lockSpending(
    String(formData.get("childId") ?? ""),
    String(formData.get("duree") ?? ""),
    String(formData.get("reason") ?? ""),
  );
  if (!ok) return { error: "Choisissez une durée de la liste." };

  revalidateAll();
  return {};
}

export async function toggleProfileEditing(formData: FormData) {
  await requireParent();
  await setProfileEditable(
    String(formData.get("childId") ?? ""),
    formData.get("allowed") === "true",
  );
  revalidateAll();
}

export async function unlockChildSpending(formData: FormData) {
  await requireParent();
  await unlockSpending(String(formData.get("childId") ?? ""));
  revalidateAll();
}
