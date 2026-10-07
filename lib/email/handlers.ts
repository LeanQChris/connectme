import { recordInbound } from "../store";

/**
 * Inbound email, Postmark-style payload shape: From, FromName, Subject,
 * TextBody, MessageID, Date, To. Configure your provider's inbound webhook to
 * POST here. Attachments are acknowledged but not imported yet.
 */
export async function handleEmailWebhook(
  userId: string,
  body: {
    From?: string;
    FromName?: string;
    Subject?: string;
    TextBody?: string;
    HtmlBody?: string;
    MessageID?: string;
    Date?: string;
  },
): Promise<void> {
  const from = body.From;
  if (!from) return;

  const subject = body.Subject?.trim();
  const text = [subject ? `Subject: ${subject}` : null, body.TextBody ?? null]
    .filter(Boolean)
    .join("\n\n") || null;

  await recordInbound({
    userId,
    channel: "email",
    externalId: body.MessageID ?? `${from}-${Date.now()}`,
    senderExternalId: from,
    senderName: body.FromName ?? from,
    senderAvatarUrl: null,
    text,
    media: [],
    type: "text",
    createdAt: body.Date ? new Date(body.Date) : new Date(),
  });
}
