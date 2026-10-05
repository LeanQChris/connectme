import { deleteConversation, getConversation, resetUnread, setStatus, updateConversationMeta } from "@/lib/store";
import { requireUserId, tenantSecrets } from "@/lib/tenant";
import { CONVERSATION_STATUSES, type ConversationStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  const tenant = await tenantSecrets(auth.userId);
  const detail = await getConversation(auth.userId, id, tenant);
  if (!detail) return Response.json({ error: "Conversation not found" }, { status: 404 });

  // Opening a thread marks it read.
  await resetUnread(auth.userId, id);

  return Response.json({
    conversation: {
      ...detail.conversation,
      unreadCount: 0,
      // summarize() ran before the reset, so stamp the boundary we just wrote.
      lastReadAt: new Date().toISOString(),
    },
    messages: detail.messages,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  const tenant = await tenantSecrets(auth.userId);

  let payload: { status?: unknown; assignee?: unknown; tags?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tags =
    Array.isArray(payload.tags) && payload.tags.every((t) => typeof t === "string")
      ? [...new Set(payload.tags.map((t) => (t as string).trim().toLowerCase()).filter(Boolean))].slice(0, 8)
      : undefined;

  const assignee =
    payload.assignee === null || typeof payload.assignee === "string"
      ? typeof payload.assignee === "string"
        ? payload.assignee.trim() || null
        : null
      : undefined;

  if (payload.status !== undefined) {
    if (!CONVERSATION_STATUSES.includes(payload.status as ConversationStatus)) {
      return Response.json({ error: "status must be 'open' or 'closed'" }, { status: 400 });
    }
    if (!(await setStatus(auth.userId, id, payload.status as ConversationStatus))) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }
  }

  if (assignee !== undefined || tags !== undefined) {
    const summary = await updateConversationMeta(auth.userId, id, { assignee, tags });
    if (!summary) return Response.json({ error: "Conversation not found" }, { status: 404 });
    return Response.json({ conversation: summary });
  }

  if (payload.status === undefined) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const detail = await getConversation(auth.userId, id, tenant);
  return Response.json({ conversation: detail?.conversation });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;
  const deleted = await deleteConversation(auth.userId, id);
  if (!deleted) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}