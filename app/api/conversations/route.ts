import { listConversations } from "@/lib/store";
import { requireSession } from "@/lib/session";
import { CHANNELS, type Channel } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const guard = await requireSession();
  if (guard) return guard;

  const requested = new URL(request.url).searchParams.get("channel");
  if (requested && !CHANNELS.includes(requested as Channel)) {
    return Response.json({ error: `Unknown channel: ${requested}` }, { status: 400 });
  }

  const conversations = await listConversations(requested ? (requested as Channel) : undefined);
  return Response.json({ conversations });
}