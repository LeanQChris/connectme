import { recordNote } from "@/lib/store";
import { requireUserId } from "@/lib/tenant";

export const runtime = "nodejs";

const MAX_NOTE_LENGTH = 2000;

/** Adds an internal note to a thread. Notes are never sent to the customer. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const { id } = await context.params;

  let payload: { text?: unknown; author?: unknown };
  try {
    payload = (await request.json()) as { text?: unknown; author?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) return Response.json({ error: "Note text is required" }, { status: 400 });
  if (text.length > MAX_NOTE_LENGTH) {
    return Response.json(
      { error: `Note is too long (maximum ${MAX_NOTE_LENGTH} characters)` },
      { status: 400 },
    );
  }

  const author = typeof payload.author === "string" && payload.author.trim() ? payload.author.trim() : "agent";

  const result = await recordNote(auth.userId, id, text, author);
  if (!result) return Response.json({ error: "Conversation not found" }, { status: 404 });

  return Response.json(result, { status: 201 });
}