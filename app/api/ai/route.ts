import { getConversation } from "@/lib/store";
import { requireUserId, tenantSecrets } from "@/lib/tenant";

export const runtime = "nodejs";

const MODES = ["summarize", "suggest", "translate"] as const;
type Mode = (typeof MODES)[number];

function threadText(messages: { direction: string; text: string | null; createdAt: string }[]): string {
  return messages
    .filter((m) => m.text && m.direction !== "note")
    .map((m) => `${m.direction === "out" ? "Agent" : "Customer"}: ${m.text}`)
    .join("\n");
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 501 });
  }

  let payload: { mode?: unknown; conversationId?: unknown; text?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof payload.mode !== "string" || !MODES.includes(payload.mode as Mode)) {
    return Response.json({ error: "mode must be summarize|suggest|translate" }, { status: 400 });
  }
  const mode = payload.mode as Mode;

  let inputText = typeof payload.text === "string" ? payload.text : "";
  if (!inputText && typeof payload.conversationId === "string" && payload.conversationId) {
    const tenant = await tenantSecrets(auth.userId);
    const detail = await getConversation(auth.userId, payload.conversationId, tenant);
    if (!detail) return Response.json({ error: "Conversation not found" }, { status: 404 });
    inputText = threadText(detail.messages);
  }
  if (!inputText.trim()) {
    return Response.json({ error: "text or conversationId is required" }, { status: 400 });
  }

  const prompt =
    mode === "summarize"
      ? `Summarize this support conversation as bullet points:\n\n${inputText}`
      : mode === "suggest"
        ? `Write one suggested reply to the customer in this conversation. Reply with the suggestion only:\n\n${inputText}`
        : `Translate the following text to English. Reply with the translation only:\n\n${inputText}`;

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return Response.json(
        { error: `AI request failed: HTTP ${response.status} ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const result = json.choices?.[0]?.message?.content ?? "";
    return Response.json({ result });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "AI request failed" },
      { status: 502 },
    );
  }
}
