import { getConversation, resetUnread } from "@/lib/store";
import { requireSession } from "@/lib/session";

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