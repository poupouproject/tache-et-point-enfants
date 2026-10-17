import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Rubik } from "next/font/google";

import "./globals.css";

// Police pixel réservée aux titres et aux compteurs (effet HUD): illisible en
// paragraphe, parfaite en gros chiffres.
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quêtes & Pièces",
  description: "Les tâches et les points de la famille",
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  // Écran de kiosque tactile: on évite le zoom accidentel à deux doigts.
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${pressStart.variable} ${rubik.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
