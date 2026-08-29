import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
