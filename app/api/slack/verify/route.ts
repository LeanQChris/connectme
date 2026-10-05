import { verifySlackBot } from "@/lib/slack/client";
import { requireUserId, tenantSecrets } from "@/lib/tenant";

export const runtime = "nodejs";

/**
 * Endpoint to test and verify the configured Slack bot token.
 * Usage: GET /api/slack/verify
 */
export async function GET(): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const secrets = await tenantSecrets(auth.userId);
  if (!secrets.slackBotToken) {
    return Response.json(
      { error: "Slack Bot Token (xoxb-...) is not configured in Settings" },
      { status: 400 },
    );
  }

  const result = await verifySlackBot(secrets.slackBotToken);

  if (!result.ok) {
    return Response.json(
      {
        ok: false,
        error: result.error || "Failed to verify Slack bot credentials",
      },
      { status: 400 },
    );
  }

  return Response.json({
    ok: true,
    team: result.team,
    teamId: result.team_id,
    user: result.user,
    botId: result.bot_id,
    url: result.url,
  });
}
