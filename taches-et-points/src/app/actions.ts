"use server";

import { revalidatePath } from "next/cache";

import { requireUnlocked } from "@/lib/auth/session";
import { completeTask } from "@/lib/tasks/service";

export type CompleteState =
  | { status: "idle" }
  | {
      status: "done";
      points: number;
      title: string;
      childId: string;
      /**
       * Horodatage de la confirmation. Sert de `key` React côté client: il
       * change à chaque succès, ce qui remonte l'élément de célébration et
       * relance son animation CSS — sans avoir à gérer d'état ni de minuterie.
       */
      at: number;
    }
  | { status: "error"; message: string };

/**
 * Confirmation d'une tâche par un enfant.
 *
 * Note de sécurité: une Server Action est joignable par POST direct, donc le
 * contrôle de session est refait ici et pas seulement à l'affichage de la page.
 */
export async function confirmTask(
  _prev: CompleteState,
  formData: FormData,
): Promise<CompleteState> {
  await requireUnlocked();

  const taskId = String(formData.get("taskId") ?? "");
  const childId = String(formData.get("childId") ?? "");

  if (!taskId || !childId) {
    return { status: "error", message: "Tâche introuvable." };
  }

  const result = await completeTask(taskId, childId);

  if (!result.ok) {
    revalidatePath("/");
    return {
      status: "error",
      message:
        result.reason === "ALREADY_TAKEN"
          ? "Trop tard, quelqu'un vient de la faire !"
          : "Cette tâche n'est plus disponible.",
    };
  }

  revalidatePath("/");
  return {
    status: "done",
    points: result.points,
    title: result.title,
    childId,
    at: Date.now(),
  };
}
