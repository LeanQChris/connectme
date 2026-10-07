import { ChannelNotConfiguredError } from "../meta/client";

function basicAuth(accountSid: string, authToken: string): string {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

/** Sends one SMS. Twilio also accepts MediaUrl entries on the same call (MMS). */
export async function sendSms(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
  mediaUrls: string[] = [],
): Promise<{ messageId: string }> {
  if (!accountSid || !authToken || !from) {
    throw new ChannelNotConfiguredError("Twilio SMS is not connected. Add credentials in Settings.");
  }

  const params = new URLSearchParams({ To: to, From: from });
  if (body) params.set("Body", body);
  for (const url of mediaUrls.slice(0, 10)) params.append("MediaUrl", url);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuth(accountSid, authToken),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  const data = (await response.json().catch(() => null)) as {
    sid?: string;
    message?: string;
  } | null;

  if (!response.ok || !data?.sid) {
    throw new Error(data?.message ?? `Twilio replied HTTP ${response.status}`);
  }

  return { messageId: data.sid };
}
