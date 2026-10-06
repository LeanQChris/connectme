import { setTyping } from "@/lib/store";
import { requireUserId } from "@/lib/tenant";
import { currentUser } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const authResult = await requireUserId();
  if (authResult instanceof Response) return authResult;

  let payload: { conversationId?: unknown; name?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof payload.conversationId !== "string" || !payload.conversationId) {
    return Response.json({ error: "conversationId is required" }, { status: 400 });
  }

  let name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : "";
  if (!name) {
    const user = await currentUser();
    name =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.username ||
      "Agent";
  }

  const entry = await setTyping(authResult.userId, payload.conversationId, name);
  return Response.json({ typing: entry });
}
