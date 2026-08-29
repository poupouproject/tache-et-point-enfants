import { LogOut } from "lucide-react";

import { SettingsForm } from "@/components/parent/settings-form";
import { requireParent } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { APP_TIMEZONE } from "@/lib/time";

import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function ParentSettingsPage() {
  await requireParent();

  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5">
      <h2 className="font-hud text-base text-white">Réglages</h2>

      <SettingsForm pointsPerDollar={settings?.pointsPerDollar ?? 100} />

      <section className="panel p-5">
        <h3 className="font-bold text-white">Fuseau horaire</h3>
        <p className="mt-2 text-sm text-hud-400">
          Les journées et les semaines sont calculées en{" "}
          <span className="font-bold text-coin">{APP_TIMEZONE}</span>. Cela se
          change avec la variable d&apos;environnement{" "}
          <code className="rounded bg-hud-950 px-2 py-0.5 text-xs">
            APP_TIMEZONE
          </code>{" "}
          (option de l&apos;add-on).
        </p>
      </section>

      <section className="panel p-5">
        <h3 className="font-bold text-white">Session</h3>
        <p className="mt-2 text-sm text-hud-400">
          Verrouiller demande de saisir à nouveau le NIP d&apos;entrée sur cet
          appareil.
        </p>

        <form action={logout} className="mt-4">
          <button type="submit" className="btn-danger">
            <LogOut className="size-5" aria-hidden />
            Verrouiller l&apos;application
          </button>
        </form>
      </section>
    </main>
  );
}
