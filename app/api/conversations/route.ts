import { listConversations } from "@/lib/store";
import { requireUserId, tenantSecrets } from "@/lib/tenant";
import { CHANNELS, type Channel } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const tenant = await tenantSecrets(auth.userId);

  const requested = new URL(request.url).searchParams.get("channel");
  if (requested && !CHANNELS.includes(requested as Channel)) {
    return Response.json({ error: `Unknown channel: ${requested}` }, { status: 400 });
  }

  const conversations = await listConversations(
    auth.userId,
    tenant,
    requested ? (requested as Channel) : undefined,
  );
  return Response.json({ conversations });
}