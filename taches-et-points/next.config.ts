import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie autonome: Next ne garde que les modules réellement atteints par le
  // code serveur. Sans elle, l'image embarque tout node_modules — dont les
  // binaires SWC et les moteurs Prisma qui ne servent qu'au build.
  output: "standalone",

  // Identifiant de ce build, figé à la compilation dans le code du serveur
  // comme dans celui du navigateur. Une page restée ouverte compare le sien à
  // celui du serveur pour savoir qu'une nouvelle version a été installée (voir
  // VersionWatch).
  env: {
    NEXT_PUBLIC_BUILD_ID: new Date().toISOString(),
  },

  // Ces paquets doivent rester chargés par Node à l'exécution plutôt qu'être
  // inclus dans le bundle: better-sqlite3 est un module natif (.node), et le
  // client Prisma charge ses propres fichiers à côté de lui.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
  ],
};

export default nextConfig;
