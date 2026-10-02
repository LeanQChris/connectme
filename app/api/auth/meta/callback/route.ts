import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import {
  exchangeCodeForUserToken,
  getLongLivedUserToken,
  getAccountsAndPages,
  subscribePageToWebhook,
  verifyOAuthState,
} from "@/lib/meta/oauth";
import { encryptSecrets } from "@/lib/secrets";
import { getCredentials, saveCredentials } from "@/lib/store";
import { tenantSecrets } from "@/lib/tenant";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorReason = url.searchParams.get("error_reason") || url.searchParams.get("error_description");

  const settingsUrl = new URL("/settings", config.appUrl || url.origin);

  if (errorReason || !code || !state) {
    const reason = errorReason || "Authorization was cancelled or failed.";
    settingsUrl.searchParams.set("error", encodeURIComponent(reason));
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state);
  if (!verified) {
    settingsUrl.searchParams.set("error", encodeURIComponent("Invalid or expired OAuth state. Please try again."));
    return NextResponse.redirect(settingsUrl);
  }

  const userId = verified.userId;

  try {
    const redirectUri = `${config.appUrl || url.origin}/api/auth/meta/callback`;

    // 1. Exchange code for short-lived user token
    const shortLivedToken = await exchangeCodeForUserToken(code, redirectUri);

    // 2. Exchange for long-lived user token (~60 days)
    const longLivedUserToken = await getLongLivedUserToken(shortLivedToken);

    // 3. Fetch user's managed Facebook Pages and Instagram accounts
    const pages = await getAccountsAndPages(longLivedUserToken);

    if (pages.length === 0) {
      settingsUrl.searchParams.set(
        "error",
        encodeURIComponent("No Facebook Pages found. Please create a Facebook Page first or grant permissions in the dialog."),
      );
      return NextResponse.redirect(settingsUrl);
    }

    // Select the first page connected
    const selectedPage = pages[0];
    const pageId = selectedPage.id;
    const pageName = selectedPage.name;
    const pageAccessToken = selectedPage.access_token;
    const instagramUsername = selectedPage.instagram_business_account?.username ?? null;

    // 4. Automatically subscribe the Page to our App's Webhooks
    await subscribePageToWebhook(pageId, pageAccessToken);

    // 5. Update tenant's credentials
    const current = await tenantSecrets(userId);
    const existingRecord = await getCredentials(userId);

    const updatedSecrets = {
      ...current,
      pageAccessToken,
      metaAppSecret: current.metaAppSecret || config.metaAppSecret || "",
      webhookVerifyToken: current.webhookVerifyToken || config.metaWebhookVerifyToken || "connectme_verify",
    };

    await saveCredentials({
      userId,
      encrypted: encryptSecrets(updatedSecrets),
      waPhoneNumberId: existingRecord?.waPhoneNumberId || updatedSecrets.waPhoneNumberId || undefined,
      pageId,
      pageName,
      instagramUsername: instagramUsername || undefined,
      telegramBotId: existingRecord?.telegramBotId,
      discordBotId: existingRecord?.discordBotId,
      updatedAt: new Date().toISOString(),
    });

    settingsUrl.searchParams.set("connected", "meta");
    settingsUrl.searchParams.set("page", pageName);
    return NextResponse.redirect(settingsUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to complete Meta authorization.";
    settingsUrl.searchParams.set("error", encodeURIComponent(msg));
    return NextResponse.redirect(settingsUrl);
  }
}
