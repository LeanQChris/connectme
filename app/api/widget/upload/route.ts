import { allowWidgetMessage, bearerToken, verifyWidgetSession } from "@/lib/widget/session";
import { requestOriginAllowed } from "@/lib/widget/origin";
import { preflight, widgetResponse } from "@/lib/widget/cors";
import { saveUpload } from "@/lib/uploads";
import { MAX_UPLOAD_BYTES } from "@/lib/types";

export const runtime = "nodejs";

const MAX_PER_MINUTE = 20;

export function OPTIONS(): Response {
  return preflight();
}

/** Visitor uploads: same session-token gate as /message, files land beside every other upload. */
export async function POST(request: Request): Promise<Response> {
  const session = verifyWidgetSession(bearerToken(request));
  if (!session) return widgetResponse({ error: "Invalid session" }, 401);
  if (!(await requestOriginAllowed(session.userId, request))) {
    return widgetResponse({ error: "Origin not allowed" }, 403);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (
    !allowWidgetMessage(`upload:${session.sid}`, MAX_PER_MINUTE, 60_000) ||
    !allowWidgetMessage(`ip:${ip}`, 60, 60_000)
  ) {
    return widgetResponse({ error: "Slow down" }, 429);
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    file = entry instanceof File ? entry : null;
  } catch {
    return widgetResponse({ error: "Expected multipart form data" }, 400);
  }
  if (!file) return widgetResponse({ error: "Missing file" }, 400);
  if (file.size > MAX_UPLOAD_BYTES) {
    return widgetResponse({ error: "File too large" }, 413);
  }

  try {
    const uploaded = await saveUpload(file);
    return widgetResponse({ media: uploaded });
  } catch (error) {
    return widgetResponse(
      { error: error instanceof Error ? error.message : "Upload failed" },
      400,
    );
  }
}
