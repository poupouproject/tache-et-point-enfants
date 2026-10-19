/**
 * Identifiant du build qui tourne, lu par VersionWatch. Public: il ne révèle
 * qu'une date de compilation.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { build: process.env.NEXT_PUBLIC_BUILD_ID },
    { headers: { "Cache-Control": "no-store" } },
  );
}
