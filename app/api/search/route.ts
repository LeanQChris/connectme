import { searchConversations } from "@/lib/store";
import { requireUserId } from "@/lib/tenant";

export const runtime = "nodejs";

const MIN_QUERY = 2;

/** Full-text message search: one hit per conversation, newest match first. */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  if (query.trim().length < MIN_QUERY) return Response.json({ hits: [] });

  const hits = await searchConversations(auth.userId, query);
  return Response.json({ hits });
}