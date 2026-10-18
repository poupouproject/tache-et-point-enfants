"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Fenêtre modale sur l'élément <dialog> natif: le navigateur gère le piège à
 * focus, la touche Échap et le fond, sans bibliothèque.
 *
 * Le contenu défile à l'intérieur de la fenêtre: sur une tablette, c'est la
 * fenêtre qui s'adapte à l'écran, jamais la page derrière qui défile.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Un tap sur le fond (hors du panneau) ferme la fenêtre.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(calc(100%-1.5rem),56rem)] max-w-none bg-transparent p-0 text-hud-200",
        "backdrop:bg-black/75 backdrop:backdrop-blur-sm open:animate-pop-in",
        className,
      )}
    >
      <div className="panel flex max-h-[min(92dvh,56rem)] flex-col bg-hud-900">
        <header className="flex items-center gap-3 border-b-2 border-hud-800 px-5 py-4">
          <h2 className="min-w-0 flex-1 font-hud text-sm leading-relaxed text-white sm:text-base">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-hud-800 text-hud-200 hover:bg-hud-700"
            aria-label="Fermer"
          >
            <X className="size-6" aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  );
}
