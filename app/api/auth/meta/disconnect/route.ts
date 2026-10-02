import { NextResponse } from "next/server";
import { encryptSecrets } from "@/lib/secrets";
import { getCredentials, saveCredentials } from "@/lib/store";
import { requireUserId, tenantSecrets } from "@/lib/tenant";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  const authResult = await requireUserId();
  if (authResult instanceof Response) return authResult;
  const { userId } = authResult;

  const currentSecrets = await tenantSecrets(userId);
  const existingRecord = await getCredentials(userId);

  const updatedSecrets = {
    ...currentSecrets,
    pageAccessToken: "",
  };

  await saveCredentials({
    userId,
    encrypted: encryptSecrets(updatedSecrets),
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
