"use client";

import { useEffect } from "react";

import { reloadOnce } from "@/lib/reload";

/**
 * Dernier recours, quand même la mise en page de l'app n'a pas pu s'afficher:
 * elle remplace tout le document, d'où ses styles en ligne.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    reloadOnce();
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b1020",
          color: "#c3cce6",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div>
          <p style={{ fontSize: 48, margin: 0 }}>🔄</p>
          <p>L&apos;application se recharge…</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "12px 24px",
              borderRadius: 16,
              border: 0,
              background: "#10b981",
              color: "#052e16",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
