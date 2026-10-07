import { getCredentials } from "../store";

/**
 * Origin allowlist for the public widget API.
 *
 * Absent or empty means any site may embed the script (the signed session
 * token still gates access to data). Once the tenant lists origins, browsers
 * from anywhere else get 403 before any session token is issued or used.
 */
export function originAllowed(
  origin: string | null,
  allowed: string[] | undefined,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!origin) return false;
  try {
    const given = new URL(origin).origin;
    return allowed.some((entry) => {
      try {
        return new URL(entry).origin === given;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/** Resolves the allowlist for the session owner and checks this request. */
export async function requestOriginAllowed(userId: string, request: Request): Promise<boolean> {
  const record = await getCredentials(userId);
  return originAllowed(request.headers.get("origin"), record?.widgetAllowedOrigins);
}
