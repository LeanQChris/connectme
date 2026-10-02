import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/tenant";
import { getMetaAuthorizationUrl, getMetaRedirectUri } from "@/lib/meta/oauth";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const userId = await currentUserId();
  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  const url = new URL(request.url);
  const settingsUrl = new URL("/settings", config.appUrl || url.origin);

  if (!config.metaAppId) {
    settingsUrl.searchParams.set(
      "error",
      encodeURIComponent("META_APP_ID is not configured in your server .env. Please add META_APP_ID to your .env file."),
    );
    return NextResponse.redirect(settingsUrl);
  }
  const redirectUri = getMetaRedirectUri(request);
  const metaUrl = getMetaAuthorizationUrl(userId, redirectUri);

  return NextResponse.redirect(metaUrl);
}
