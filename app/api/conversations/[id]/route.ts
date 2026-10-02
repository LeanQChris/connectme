import { getConversation, resetUnread, setStatus } from "@/lib/store";
import { requireSession } from "@/lib/session";
import { CONVERSATION_STATUSES, type ConversationStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireSession();
  if (guard) return guard;

  const { id } = await context.params;
  const detail = await getConversation(id);
  if (!detail) return Response.json({ error: "Conversation not found" }, { status: 404 });

  // Opening a thread marks it read.
  await resetUnread(id);

  return Response.json({
    conversation: { ...detail.conversation, unreadCount: 0 },
    messages: detail.messages,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await requireSession();
  if (guard) return guard;

  const { status } = (await request.json().catch(() => ({}))) as { status?: unknown };
  if (!CONVERSATION_STATUSES.includes(status as (typeof CONVERSATION_STATUSES)[number])) {
    return Response.json({ error: "status must be 'open' or 'closed'" }, { status: 400 });
  }

  const { id } = await context.params;
  if (!(await setStatus(id, status as ConversationStatus))) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const detail = await getConversation(id);
  return Response.json({ conversation: detail?.conversation });
}