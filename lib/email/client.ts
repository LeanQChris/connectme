import { ChannelNotConfiguredError } from "../meta/client";

const RESEND_API = "https://api.resend.com/emails";

/** Sends one email through a Resend-compatible API. */
export async function sendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  text: string,
  attachments: Array<{ url: string; name: string | null }> = [],
): Promise<{ messageId: string }> {
  if (!apiKey || !from) {
    throw new ChannelNotConfiguredError("Email is not connected. Add the API key and sender address in Settings.");
  }

  const response = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      attachments: attachments.map((a) => ({ path: a.url, filename: a.name ?? "attachment" })),
    }),
  });

  const data = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok || !data?.id) {
    throw new Error(data?.message ?? `Email provider replied HTTP ${response.status}`);
  }
  return { messageId: data.id };
}
