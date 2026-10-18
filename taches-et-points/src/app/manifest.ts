import type { MetadataRoute } from "next";

/**
 * Manifeste d'application web: c'est lui qui permet d'installer l'app sur la
 * tablette, avec son icône dans le menu des applications.
 *
 * `fullscreen` cache aussi la barre d'état d'Android: sur une tablette posée
 * au mur, l'app occupe tout l'écran. Un navigateur qui ne connaît pas ce mode
 * retombe sur `standalone` (sans barre d'adresse).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quêtes & Pièces",
    short_name: "Quêtes",
    description: "Les tâches et les pièces de la famille",
    lang: "fr-CA",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation: "any",
    background_color: "#0b1020",
    theme_color: "#0b1020",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
