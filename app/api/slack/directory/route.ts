import { NextResponse } from "next/server";
import { fetchSlackDirectory } from "@/lib/slack/client";
import { requireUserId, tenantSecrets } from "@/lib/tenant";
import { listKnownSlackChannels } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const secrets = await tenantSecrets(auth.userId);
  if (!secrets.slackBotToken) {
    return NextResponse.json(
      { error: "Slack is not connected. Configure your bot token in Settings." },
      { status: 400 }
    );
  }

  try {
    const knownChannels = await listKnownSlackChannels(auth.userId);
    const directory = await fetchSlackDirectory(secrets.slackBotToken, knownChannels);
    return NextResponse.json(directory);
  } catch (err) {
    console.error("[api/slack/directory] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Slack directory" },
      { status: 500 }
    );
  }
}
