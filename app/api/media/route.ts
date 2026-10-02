import { config } from "@/lib/config";

export const runtime = "nodejs";

/**
 * Media proxy for WhatsApp Cloud API attachments.
 * Meta's lookaside.fbsbx.com URLs require the Bearer token in the header,
 * which standard <img> and <audio> tags cannot send directly.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("id");
  const directUrl = searchParams.get("url");

  const token = config.waAccessToken;
  if (!token) {
    return new Response("WhatsApp access token not configured", { status: 400 });
  }

  try {
    let downloadUrl: string | null = directUrl ?? null;

    // If media ID is provided, query Graph API for the download URL
    if (mediaId && !downloadUrl) {
      const metaRes = await fetch(
        `https://graph.facebook.com/${config.graphVersion}/${mediaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!metaRes.ok) {
        return new Response("Failed to fetch media metadata from Meta", {
          status: metaRes.status,
        });
      }

      const metaData = (await metaRes.json()) as { url?: string };
      downloadUrl = metaData.url ?? null;
    }

    if (!downloadUrl) {
      return new Response("No download URL available", { status: 404 });
    }

    // Download the binary from Meta's CDN
    const binaryRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!binaryRes.ok) {
      return new Response("Failed to download media content from Meta", {
        status: binaryRes.status,
      });
    }

    const contentType = binaryRes.headers.get("content-type") || "application/octet-stream";
    const body = await binaryRes.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("[media proxy] error streaming media:", error);
    return new Response("Internal error streaming media", { status: 500 });
  }
}
