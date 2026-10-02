import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/tenant";
import { getMetaAuthorizationUrl } from "@/lib/meta/oauth";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const userId = await currentUserId();
  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (!config.metaAppId) {
    return NextResponse.json(
      { error: "APP_ID is not configured in server environment (.env). Restart your server if you just added it." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const redirectUri = `${config.appUrl || url.origin}/api/auth/meta/callback`;
  const metaUrl = getMetaAuthorizationUrl(userId, redirectUri);

  return NextResponse.redirect(metaUrl);
}
