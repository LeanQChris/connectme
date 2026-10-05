/**
 * CORS for the public widget routes.
 *
 * The widget script is served from the ConnectMe domain but runs inside the
 * customer's website, so every call it makes is cross-origin. `*` is correct
 * here: these routes carry no cookies, the tenant comes from the signed session
 * token, and `Authorization` is a non-credential header so no preflight is even
 * needed for it. Anything a browser can reach is public for this channel anyway.
 */

export const WIDGET_CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-max-age": "86400",
};

export function widgetResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: WIDGET_CORS });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: WIDGET_CORS });
}