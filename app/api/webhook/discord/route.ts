import { handleDiscordMessage } from "@/lib/discord/handlers";
import type { DiscordMessage, DiscordUser } from "@/lib/discord/types";
import { listCredentials } from "@/lib/store";
import { tenantSecrets } from "@/lib/tenant";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const raw = await request.text();
    if (!raw) {
      return new Response(JSON.stringify({ error: "Empty body" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const body = JSON.parse(raw) as {
      type?: number;
      message?: DiscordMessage;
      id?: string;
      channel_id?: string;
      author?: DiscordUser;
      member?: { user: DiscordUser };
      user?: DiscordUser;
      data?: {
        name?: string;
        options?: Array<{ name: string; value: string }>;
      };
      content?: string;
      userId?: string;
    };

    // Discord Interaction PING (type 1)
    if (body.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Find the tenant owner
    const url = new URL(request.url);
    let targetUserId = url.searchParams.get("userId") || body.userId;

    if (!targetUserId) {
      // Find tenant with discord configured
      const credentials = await listCredentials();
      const match = credentials.find((c) => c.encrypted);
      targetUserId = match?.userId;
    }

    if (!targetUserId) {
      console.warn("[discord webhook] no tenant found for discord message");
      return new Response(JSON.stringify({ ok: false, error: "No configured tenant" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const secrets = await tenantSecrets(targetUserId);
    if (!secrets.discordBotToken) {
      console.warn("[discord webhook] tenant has no discord token configured");
      return new Response(JSON.stringify({ ok: false, error: "Discord not configured" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Handle Discord Slash Command / Interaction (type 2: APPLICATION_COMMAND)
    if (body.type === 2 && body.data) {
      const commandName = body.data.name;
      const messageOption = body.data.options?.find((opt) => opt.name === "message");
      const textContent = messageOption?.value || `/${commandName}`;

      const author = body.member?.user || body.user || {
        id: "anonymous",
        username: "Discord User",
      };

      const interactionMessage: DiscordMessage = {
        id: body.id || String(Date.now()),
        channel_id: body.channel_id || "general",
        author,
        content: textContent,
        timestamp: new Date().toISOString(),
      };

      await handleDiscordMessage(secrets.discordBotToken, targetUserId, interactionMessage);

      // Respond immediately to Discord so the user gets a confirmation
      return new Response(
        JSON.stringify({
          type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
          data: {
            content: `✅ **Message received by ConnectMe!** Our support team has been notified and will reply here shortly.\n> *"${textContent}"*`,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Standard message payload
    const msg: DiscordMessage | undefined =
      body.message || (body.channel_id && body.author ? (body as unknown as DiscordMessage) : undefined);

    if (!msg) {
      return new Response(JSON.stringify({ ok: true, ignored: "No message payload" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    await handleDiscordMessage(secrets.discordBotToken, targetUserId, msg);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("[discord webhook] error processing event:", error);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function GET(): Promise<Response> {
  return new Response("Discord Webhook Active", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
