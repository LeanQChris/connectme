import { NextResponse } from "next/server";
import { encryptSecrets } from "@/lib/secrets";
import { getCredentials, saveCredentials } from "@/lib/store";
import { removeConnectedAccount, requireUserId, tenantSecrets } from "@/lib/tenant";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const authResult = await requireUserId();
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const body = (await request.json().catch(() => ({}))) as { accountId?: string };

  // If a specific accountId is specified, remove only that account
  if (body.accountId) {
    await removeConnectedAccount(userId, body.accountId);
    return NextResponse.json({ success: true, removed: body.accountId });
  }

  // Otherwise disconnect all legacy/meta records
  const currentSecrets = await tenantSecrets(userId);
  const existingRecord = await getCredentials(userId);

  const updatedSecrets = {
    ...currentSecrets,
    pageAccessToken: "",
  };

  await saveCredentials({
    userId,
    encrypted: encryptSecrets(updatedSecrets),
    accounts: [],
    waPhoneNumberId: existingRecord?.waPhoneNumberId,
    pageId: undefined,
    pageName: undefined,
    instagramUsername: undefined,
    telegramBotId: existingRecord?.telegramBotId,
    discordBotId: existingRecord?.discordBotId,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
