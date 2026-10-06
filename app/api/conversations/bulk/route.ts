import { bulkConversationUpdate } from "@/lib/store";
import { requireUserId } from "@/lib/tenant";
import { CONVERSATION_STATUSES, type ConversationStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  let payload: { ids?: unknown; status?: unknown; assignee?: unknown; tags?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(payload.ids) || payload.ids.some((id) => typeof id !== "string")) {
    return Response.json({ error: "ids must be a string array" }, { status: 400 });
  }

  const patch: { status?: ConversationStatus; assignee?: string | null; tags?: string[] } = {};
  if (payload.status !== undefined) {
    if (!CONVERSATION_STATUSES.includes(payload.status as ConversationStatus)) {
      return Response.json({ error: "status must be 'open' or 'closed'" }, { status: 400 });
    }
    patch.status = payload.status as ConversationStatus;
  }
  if (payload.assignee === null || typeof payload.assignee === "string") {
    patch.assignee = payload.assignee;
  } else if (payload.assignee !== undefined) {
    return Response.json({ error: "assignee must be a string or null" }, { status: 400 });
  }
  if (payload.tags !== undefined) {
    if (!Array.isArray(payload.tags) || payload.tags.some((t) => typeof t !== "string")) {
      return Response.json({ error: "tags must be a string array" }, { status: 400 });
    }
    patch.tags = payload.tags as string[];
  }

  const updated = await bulkConversationUpdate(auth.userId, payload.ids as string[], patch);
  return Response.json({ updated });
}
