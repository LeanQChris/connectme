import { handleSlackMessage } from "@/lib/slack/handlers";
import type { SlackWebhookPayload } from "@/lib/slack/types";
import { verifySlackSignature } from "@/lib/slack/verify";
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

    const signature = request.headers.get("x-slack-signature");
    const timestamp = request.headers.get("x-slack-request-timestamp");

    const payload = JSON.parse(raw) as SlackWebhookPayload;

    // 1. Handle Slack URL Verification Challenge
    if (payload.type === "url_verification") {
      return new Response(JSON.stringify({ challenge: payload.challenge }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // 2. Identify target tenant
    const url = new URL(request.url);
    let targetUserId: string | null = url.searchParams.get("userId");

    const credentials = await listCredentials();

    if (!targetUserId && signature && timestamp) {
      // Find tenant whose Slack signing secret matches the signature
      for (const cred of credentials) {
        const sec = await tenantSecrets(cred.userId);
        if (
          sec.slackSigningSecret &&
          verifySlackSignature(raw, signature, timestamp, sec.slackSigningSecret)
        ) {
          targetUserId = cred.userId;
          break;
        }
      }
    }

    if (!targetUserId) {
      const match = credentials.find((c) => c.encrypted);
      targetUserId = match?.userId ?? null;
    }

    if (!targetUserId) {
      console.warn("[slack webhook] no tenant found for slack event");
      return new Response(JSON.stringify({ ok: false, error: "No configured tenant" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const secrets = await tenantSecrets(targetUserId);

    // 3. Verify signature if signing secret is configured
    if (signature && timestamp && secrets.slackSigningSecret) {
      const isValid = verifySlackSignature(raw, signature, timestamp, secrets.slackSigningSecret);
      if (!isValid) {
        console.warn("[slack webhook] invalid signature");
        return new Response("Invalid request signature", { status: 401 });
      }
    }

    if (!secrets.slackBotToken) {
      console.warn("[slack webhook] tenant has no slack bot token configured");
      return new Response(JSON.stringify({ ok: false, error: "Slack not configured" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // 4. Handle Event Callback
    if (payload.type === "event_callback" && payload.event) {
      if (payload.event.type === "message") {
        await handleSlackMessage(
          secrets.slackBotToken,
          targetUserId,
          payload.event,
          payload.team_id,
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("[slack webhook] error processing event:", error);
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function GET(): Promise<Response> {
  return new Response("Slack Webhook Active", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
