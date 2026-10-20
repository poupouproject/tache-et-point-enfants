"use client";

import { Check, Copy, Eye, EyeOff, House } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Presse-papiers refusé (adresse HTTP): le texte reste sélectionnable.
        }
      }}
      className="inline-flex items-center gap-2 rounded-xl bg-hud-700 px-3 py-2 text-xs font-bold text-hud-200 hover:bg-hud-600"
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? "Copié" : label}
    </button>
  );
}

/**
 * Lien avec Home Assistant: état de la connexion, et ce qu'il faut copier
 * dans la configuration de HA pour approuver depuis une notification.
 */
export function HaSettings({
  connected,
  lastError,
  hostname,
  token,
}: {
  connected: boolean;
  lastError: string | null;
  hostname: string | null;
  token: string | null;
}) {
  const [reveal, setReveal] = useState(false);

  const url = `http://${hostname ?? "<nom-d-hote-de-l-application>"}:3000/api/ha/decision`;
  const yaml = `rest_command:
  quetes_pieces_decision:
    url: "${url}"
    method: POST
    headers:
      Authorization: !secret quetes_pieces_jeton
    content_type: "application/json"
    payload: '{"type": "{{ type }}", "id": "{{ id }}", "decision": "{{ decision }}"}'`;
  const secret = `quetes_pieces_jeton: "Bearer ${token ?? ""}"`;

  return (
    <section className="panel space-y-4 p-5">
      <h3 className="flex items-center gap-2 font-bold text-white">
        <House className="size-5 text-sky-400" aria-hidden />
        Home Assistant
      </h3>

      <p
        className={cn(
          "rounded-2xl px-4 py-3 text-sm font-bold",
          connected && !lastError ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300",
        )}
      >
        {connected
          ? lastError
            ? `Connecté, mais le dernier envoi a échoué : ${lastError}`
            : "Connecté : capteurs et événements publiés dans Home Assistant."
          : "Non connecté : l'application ne tourne pas comme application Home Assistant."}
      </p>

      {token && (
        <>
          <div>
            <p className="label">Approuver depuis Home Assistant</p>
            <p className="text-sm text-hud-400">
              Ajoutez cette commande à <code className="text-hud-200">configuration.yaml</code>, et le jeton à{" "}
              <code className="text-hud-200">secrets.yaml</code>, puis redémarrez Home Assistant. La fiche
              Documentation de l&apos;application explique la suite.
            </p>
          </div>

          <pre className="overflow-x-auto rounded-2xl bg-hud-950 p-4 text-xs text-hud-200">{yaml}</pre>
          <CopyButton text={yaml} label="Copier la commande" />

          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-hud-950 px-3 py-2 text-xs whitespace-nowrap text-hud-200">
              {reveal ? secret : "quetes_pieces_jeton: \"Bearer ••••••••••••••••\""}
            </code>
            <button
              type="button"
              onClick={() => setReveal(!reveal)}
              className="inline-flex size-9 items-center justify-center rounded-xl bg-hud-700 text-hud-200 hover:bg-hud-600"
              aria-label={reveal ? "Masquer le jeton" : "Afficher le jeton"}
            >
              {reveal ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
            <CopyButton text={secret} label="Copier le jeton" />
          </div>
          <p className="text-xs text-hud-400">
            Ce jeton permet d&apos;approuver des demandes, y compris de l&apos;argent : gardez-le dans{" "}
            <code>secrets.yaml</code>, pas dans une automatisation partagée.
          </p>
        </>
      )}
    </section>
  );
}
