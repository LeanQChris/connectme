import { AIRouter, parseConfig } from "@ai-router-sdk/core";

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

  const secrets = await tenantSecrets(auth.userId);
  if (!secrets.aiApiKey) {
    return Response.json({ error: "Add your AI provider key in Settings" }, { status: 501 });
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
    const detail = await getConversation(auth.userId, payload.conversationId, secrets);
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

  try {
    const config = parseConfig({
      strategy: "fallback",
      routes: [
        {
          id: "user",
          provider: secrets.aiProvider || "openai",
          model: secrets.aiModel || "gpt-4o-mini",
          apiKey: secrets.aiApiKey,
        },
      ],
    });
    const router = new AIRouter(config);
    const response = await router.complete({
      model: "user",
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.choices[0]?.message.content;
    return Response.json({ result: typeof content === "string" ? content : "" });
  } catch (err) {
    const attempt =
      err instanceof Error && "attempts" in err
        ? (err as { attempts?: { provider: string; model: string; kind?: string; message?: string }[] })
            .attempts?.[0]
        : undefined;
    const detail = attempt?.message;
    return Response.json(
      {
        error: detail
          ? `${attempt!.provider}/${attempt!.model}: ${detail}`
          : err instanceof Error
            ? err.message
            : "AI request failed",
      },
      { status: 502 },
    );
  }
}
