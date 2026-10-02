import { registerDiscordSlashCommands } from "@/lib/discord/client";
import { requireUserId, tenantSecrets } from "@/lib/tenant";

export const runtime = "nodejs";

/**
 * Convenience endpoint to register the `/connectme` slash command on Discord.
 * Usage: GET /api/discord/setup
 */
export async function GET(): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const secrets = await tenantSecrets(auth.userId);
  if (!secrets.discordBotToken) {
    return Response.json(
      { error: "Discord Bot token is not configured in Settings" },
      { status: 400 }
    );
  }

  const result = await registerDiscordSlashCommands(secrets.discordBotToken);

  return Response.json({
    status: result.ok ? "success" : "error",
    command: "/connectme",
    result,
    instruction:
      "The /connectme slash command is now registered on Discord! Users in your Discord server can now type /connectme [message].",
  });
}
