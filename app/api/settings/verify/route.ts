import { verifyDiscord, verifyEmail, verifyPage, verifySlack, verifySms, verifyTelegram, verifyViber, verifyWhatsApp } from "@/lib/providers";
import { requireUserId, syncProviderMetadata, tenantSecrets } from "@/lib/tenant";

export const runtime = "nodejs";

const CHANNELS = ["whatsapp", "page", "telegram", "discord", "slack", "sms", "viber", "email"] as const;
type Channel = (typeof CHANNELS)[number];

/**
 * Calls the platform with the tenant's saved credentials and reports what came
 * back, so the settings form can show a real connection status.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  let payload: { channel?: unknown };
  try {
    payload = (await request.json()) as { channel?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const channel = payload.channel;
  if (!CHANNELS.includes(channel as Channel)) {
    return Response.json({ error: `channel must be one of ${CHANNELS.join(", ")}` }, { status: 400 });
  }

  const secrets = await tenantSecrets(auth.userId);
  let res;

  switch (channel as Channel) {
    case "whatsapp":
      res = await verifyWhatsApp(secrets);
      break;
    case "page":
      res = await verifyPage(secrets);
      break;
    case "discord":
      res = await verifyDiscord(secrets);
      break;
    case "slack":
      res = await verifySlack(secrets);
      break;
    case "sms":
      res = await verifySms(secrets);
      break;
    case "viber":
      res = await verifyViber(secrets);
      break;
    case "email":
      res = await verifyEmail(secrets);
      break;
    default:
      res = await verifyTelegram(secrets);
      break;
  }

  if (res.ok) {
    await syncProviderMetadata(auth.userId).catch(() => null);
  }

  return Response.json(res);
}
