import { revalidatePath } from "next/cache";

import { applyDecision, decisionToken, isAuthorized } from "@/lib/ha/decision";

/**
 * Point d'entrée du rest_command de Home Assistant:
 * POST /api/ha/decision  {"type":"recompense","id":"…","decision":"approuver"}
 * avec l'en-tête Authorization: Bearer <jeton des réglages>.
 *
 * Hors du proxy de session (pas de cookie depuis Home Assistant): c'est le
 * jeton qui protège la route.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!decisionToken()) {
    return Response.json({ ok: false, error: "décisions depuis Home Assistant non configurées" }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "jeton invalide" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = await applyDecision(body);
  if (!result.ok) return Response.json(result, { status: 400 });

  revalidatePath("/", "layout");
  return Response.json(result);
}
