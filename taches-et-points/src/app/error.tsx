"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";

import { reloadOnce } from "@/lib/reload";

/**
 * Page d'erreur de l'app, à la place de celle du navigateur.
 *
 * La cause la plus fréquente est une page restée ouverte pendant une mise à
 * jour: on recharge d'office, une fois. Si ça ne suffit pas, le bouton reste.
 */
export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    reloadOnce();
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="panel max-w-md p-8 text-center">
        <p className="text-5xl" aria-hidden>
          🔄
        </p>
        <h1 className="mt-4 font-hud text-base leading-relaxed text-white">
          Un instant…
        </h1>
        <p className="mt-4 text-sm text-hud-400">
          L&apos;application se recharge. Rien n&apos;a été perdu. Si rien ne se
          passe, touche le bouton.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary mt-6 w-full"
        >
          <RotateCw className="size-5" aria-hidden />
          Recharger
        </button>
      </div>
    </main>
  );
}
