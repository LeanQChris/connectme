import { addSnippet, deleteSnippet, listSnippets } from "@/lib/store";
import { requireUserId } from "@/lib/tenant";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;
  return Response.json({ snippets: await listSnippets(auth.userId) });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  let payload: { shortcut?: unknown; text?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof payload.shortcut !== "string" || !payload.shortcut.trim()) {
    return Response.json({ error: "shortcut is required" }, { status: 400 });
  }
  if (typeof payload.text !== "string" || !payload.text.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  const snippet = await addSnippet(auth.userId, payload.shortcut.trim(), payload.text);
  return Response.json({ snippet }, { status: 201 });
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id query param is required" }, { status: 400 });

  const deleted = await deleteSnippet(auth.userId, id);
  if (!deleted) return Response.json({ error: "Snippet not found" }, { status: 404 });
  return Response.json({ ok: true });
}
