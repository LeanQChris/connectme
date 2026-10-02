import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = "/api/auth/meta/connect";
  return NextResponse.redirect(url);
}
