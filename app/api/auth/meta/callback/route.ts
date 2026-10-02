import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import {
  exchangeCodeForUserToken,
  getLongLivedUserToken,
  getAccountsAndPages,
  subscribePageToWebhook,
  verifyOAuthState,
  getMetaRedirectUri,
} from "@/lib/meta/oauth";
import { addOrUpdateConnectedAccounts } from "@/lib/tenant";
import type { ConnectedAccount } from "@/lib/types";

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
    const redirectUri = getMetaRedirectUri(request);

    // 1. Exchange code for short-lived user token
    const shortLivedToken = await exchangeCodeForUserToken(code, redirectUri);

    // 2. Exchange for long-lived user token (~60 days)
    const longLivedUserToken = await getLongLivedUserToken(shortLivedToken);

    // 3. Fetch all user's managed Facebook Pages and Instagram accounts
    const pages = await getAccountsAndPages(longLivedUserToken);

    if (pages.length === 0) {
      settingsUrl.searchParams.set(
        "error",
        encodeURIComponent("No Facebook Pages found. Please create a Facebook Page first or grant permissions in the dialog."),
      );
      return NextResponse.redirect(settingsUrl);
    }

    const newAccounts: ConnectedAccount[] = [];
    const now = new Date().toISOString();

    // 4. Process all pages
    for (const page of pages) {
      const pageId = page.id;
      const pageName = page.name;
      const pageAccessToken = page.access_token;

      // Automatically subscribe the Page to our App's Webhooks
      await subscribePageToWebhook(pageId, pageAccessToken).catch((subErr) => {
        console.warn(`[oauth] Failed to auto-subscribe page ${pageId}:`, subErr);
      });

      // Add Facebook Page
      newAccounts.push({
        id: `meta_page_${pageId}`,
        provider: "meta",
        channel: "messenger",
        name: pageName,
        externalId: pageId,
        token: pageAccessToken,
        connectedAt: now,
      });

      // Add connected Instagram account if available
      if (page.instagram_business_account?.id) {
        const igId = page.instagram_business_account.id;
        const igHandle = page.instagram_business_account.username || `${pageName} (Instagram)`;
        newAccounts.push({
          id: `meta_ig_${igId}`,
          provider: "meta",
          channel: "instagram",
          name: igHandle.startsWith("@") ? igHandle : `@${igHandle}`,
          externalId: igId,
          token: pageAccessToken,
          connectedAt: now,
        });
      }
    }

    // 5. Store all connected accounts into tenant record
    await addOrUpdateConnectedAccounts(userId, newAccounts);

    settingsUrl.searchParams.set("connected", "meta");
    settingsUrl.searchParams.set("count", String(newAccounts.length));
    return NextResponse.redirect(settingsUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to complete Meta authorization.";
    settingsUrl.searchParams.set("error", encodeURIComponent(msg));
    return NextResponse.redirect(settingsUrl);
  }
}
