import { House } from "lucide-react";

/**
 * Remplace le champ d'un NIP imposé par Home Assistant: on ne peut pas le
 * changer dans l'app, on explique où il se règle.
 */
export function ManagedPin({ label }: { label: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <p className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-hud-700 px-4 py-3 text-sm text-hud-200">
        <House className="mt-0.5 size-5 shrink-0 text-sky-400" aria-hidden />
        <span>
          Géré dans Home Assistant, dans la configuration de l&apos;application.
          Pour le changer, modifiez l&apos;option puis redémarrez
          l&apos;application.
        </span>
      </p>
    </div>
  );
}
