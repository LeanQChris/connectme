/**
 * Provider credential verification.
 *
 * Each function calls the platform once with the tenant's own token and returns
 * a human-readable result, so the settings form can show what is wrong instead
 * of just failing on the first message.
 */

import { graphUrl } from "./config";
import { telegramBotId } from "./secrets";
import type { ProviderSecrets } from "./types";

export interface VerifyResult {
  ok: boolean;
  /** Shown next to the field, e.g. the Page name or bot username. */
  detail: string;
  /** Populated on success; stored in plaintext so webhooks can route on it. */
  pageId?: string;
}

function errorText(payload: unknown, fallback: string): string {
  const body = payload as { error?: { message?: string } } | null;
  return body?.error?.message ?? fallback;
}

export async function verifyWhatsApp(secrets: ProviderSecrets): Promise<VerifyResult> {
  if (!secrets.waPhoneNumberId || !secrets.waAccessToken) {
    return { ok: false, detail: "Phone number id and access token are both required." };
  }

  const url = `${graphUrl(secrets.graphVersion, secrets.waPhoneNumberId)}?fields=display_phone_number,verified_name&access_token=${encodeURIComponent(secrets.waAccessToken)}`;
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return { ok: false, detail: errorText(payload, `Meta replied HTTP ${response.status}`) };
  }

  const body = payload as { display_phone_number?: string; verified_name?: string };
  const label = body.verified_name || body.display_phone_number || secrets.waPhoneNumberId;
  return { ok: true, detail: `Connected to ${label}` };
}

/** The Page token also carries Instagram messaging, so one check covers both. */
export async function verifyPage(secrets: ProviderSecrets): Promise<VerifyResult> {
  if (!secrets.pageAccessToken) {
    return { ok: false, detail: "Page access token is required." };
  }

  const url = `${graphUrl(secrets.graphVersion, "me")}?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(secrets.pageAccessToken)}`;
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return { ok: false, detail: errorText(payload, `Meta replied HTTP ${response.status}`) };
  }

  const body = payload as {
    id?: string;
    name?: string;
    instagram_business_account?: { id?: string };
  };
  const ig = body.instagram_business_account?.id;
  const detail = [
    `Page: ${body.name ?? body.id ?? "unknown"}`,
    ig ? `Instagram: linked (${ig})` : "Instagram: not linked to this Page",
  ].join(" · ");

  return { ok: true, detail, pageId: body.id };
}

export async function verifyTelegram(secrets: ProviderSecrets): Promise<VerifyResult> {
  const token = secrets.telegramBotToken;
  if (!token) return { ok: false, detail: "Bot token is required." };
  if (!telegramBotId(token)) {
    return { ok: false, detail: "That does not look like a BotFather token." };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
    result?: { username?: string; first_name?: string };
  } | null;

  if (!response.ok || !payload?.ok || !payload.result) {
    return { ok: false, detail: payload?.description ?? `Telegram replied HTTP ${response.status}` };
  }

  const name = payload.result.first_name ?? payload.result.username ?? "bot";
  return { ok: true, detail: `Connected as @${payload.result.username ?? name}` };
}

export async function verifyDiscord(secrets: ProviderSecrets): Promise<VerifyResult> {
  const token = secrets.discordBotToken?.trim();
  if (!token) return { ok: false, detail: "Discord Bot token is required." };

  try {
    const response = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as {
      id?: string;
      username?: string;
      global_name?: string;
      message?: string;
    } | null;

    if (!response.ok || !payload?.id) {
      return { ok: false, detail: payload?.message ?? `Discord replied HTTP ${response.status}` };
    }

    const name = payload.global_name || payload.username || "Bot";
    return { ok: true, detail: `Connected as @${payload.username} (${name})` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function verifySlack(secrets: ProviderSecrets): Promise<VerifyResult> {
  const token = secrets.slackBotToken?.trim();
  if (!token) return { ok: false, detail: "Slack Bot Token (xoxb-...) is required." };

  try {
    const response = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      team?: string;
      user?: string;
    } | null;

    if (!response.ok || !payload?.ok) {
      return { ok: false, detail: payload?.error || `Slack replied HTTP ${response.status}` };
    }

    const team = payload.team || "Workspace";
    const user = payload.user ? ` (${payload.user})` : "";
    return { ok: true, detail: `Connected to ${team}${user}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function verifySms(secrets: ProviderSecrets): Promise<VerifyResult> {
  if (!secrets.twilioAccountSid || !secrets.twilioAuthToken) {
    return { ok: false, detail: "Twilio Account SID and Auth Token are both required." };
  }
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(secrets.twilioAccountSid)}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${secrets.twilioAccountSid}:${secrets.twilioAuthToken}`).toString("base64")}`,
        },
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      friendly_name?: string;
      message?: string;
    } | null;
    if (!response.ok || !payload?.friendly_name) {
      return { ok: false, detail: payload?.message ?? `Twilio replied HTTP ${response.status}` };
    }
    return { ok: true, detail: `Connected to ${payload.friendly_name}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function verifyViber(secrets: ProviderSecrets): Promise<VerifyResult> {
  const token = secrets.viberAuthToken?.trim();
  if (!token) return { ok: false, detail: "Viber Auth Token is required." };
  try {
    const response = await fetch("https://chatapi.viber.com/pa/get_account_info", {
      method: "POST",
      headers: { "content-type": "application/json", "X-Viber-Auth-Token": token },
      body: "{}",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as {
      status?: number;
      status_message?: string;
      name?: string;
    } | null;
    if (!response.ok || payload?.status !== 0) {
      return { ok: false, detail: payload?.status_message ?? `Viber replied HTTP ${response.status}` };
    }
    return { ok: true, detail: `Connected to ${payload?.name ?? "Viber bot"}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "Connection failed" };
  }
}

export async function verifyEmail(secrets: ProviderSecrets): Promise<VerifyResult> {
  if (!secrets.emailApiKey || !secrets.emailFrom) {
    return { ok: false, detail: "Email API key and sender address are both required." };
  }
  try {
    // Resend exposes GET /domains to validate the key without sending.
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${secrets.emailApiKey}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      return { ok: false, detail: payload?.message ?? `Email provider replied HTTP ${response.status}` };
    }
    return { ok: true, detail: `Connected as ${secrets.emailFrom}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "Connection failed" };
  }
}
