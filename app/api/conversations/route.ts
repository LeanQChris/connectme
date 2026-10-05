import { findOrCreateConversation, listConversations } from "@/lib/store";
import { requireUserId, tenantSecrets } from "@/lib/tenant";
import { CHANNELS, type Channel } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  const tenant = await tenantSecrets(auth.userId);

  const requested = new URL(request.url).searchParams.get("channel");
  if (requested && !CHANNELS.includes(requested as Channel)) {
    return Response.json({ error: `Unknown channel: ${requested}` }, { status: 400 });
  }

  const conversations = await listConversations(
    auth.userId,
    tenant,
    requested ? (requested as Channel) : undefined,
  );
  return Response.json({ conversations });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUserId();
  if (auth instanceof Response) return auth;

  try {
    const body = (await request.json()) as {
      channel: Channel;
      contactExternalId: string;
      contactName?: string | null;
      avatarUrl?: string | null;
      accountId?: string | null;
      accountName?: string | null;
    };

    if (!body.channel || !CHANNELS.includes(body.channel)) {
      return Response.json({ error: "Valid channel is required" }, { status: 400 });
    }

    if (!body.contactExternalId || typeof body.contactExternalId !== "string") {
      return Response.json({ error: "contactExternalId is required" }, { status: 400 });
    }

    const conversation = await findOrCreateConversation({
      userId: auth.userId,
      channel: body.channel,
      contactExternalId: body.contactExternalId.trim(),
      contactName: body.contactName?.trim() || null,
      contactAvatarUrl: body.avatarUrl || null,
      accountId: body.accountId || null,
      accountName: body.accountName || null,
    });

    return Response.json({ conversation });
  } catch (err) {
    console.error("[api/conversations POST] error:", err);
    return Response.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}