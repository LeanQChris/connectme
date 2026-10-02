import { config } from "@/lib/config";
import { requireSession } from "@/lib/session";
import { readUpload, saveUpload } from "@/lib/uploads";

export const runtime = "nodejs";

/** Stores an outbound attachment and returns the URL the UI should send on. */
export async function POST(request: Request): Promise<Response> {
  const guard = await requireSession();
  if (guard) return guard;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Expected multipart field 'file'" }, { status: 400 });
  }

  try {
    return Response.json(await saveUpload(file), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

/**
 * Serves locally uploaded attachments, then proxies Meta's lookaside URLs:
 * those require the Bearer token in a header, which <img>/<audio> cannot send.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const local = searchParams.get("file");
  if (local) {
    const upload = await readUpload(local);
    if (!upload) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(upload.body), {
      status: 200,
      headers: {
        "content-type": upload.mimeType,
        "content-length": String(upload.body.byteLength),
        "cache-control": "private, max-age=3600",
      },
    });
  }

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
