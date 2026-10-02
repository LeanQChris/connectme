import { createHmac, timingSafeEqual } from "node:crypto";

export interface OAuthStatePayload {
  /** tenant id the OAuth account will be bound to */
  t: string;
  /** single-use nonce, tracked in Redis */
  n: string;
  /** PKCE code verifier */
  v: string;
  /** expiry, epoch ms */
  exp: number;
}

function stateSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET or ENCRYPTION_KEY must be set to sign OAuth state.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", stateSecret()).update(payload).digest("hex");
}

export function encodeOAuthState(payload: OAuthStatePayload): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function decodeOAuthState(state: string): OAuthStatePayload | null {
  if (!state || !state.includes(".")) return null;
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;

  const expected = Buffer.from(sign(encoded), "hex");
  const provided = Buffer.from(signature, "hex");
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthStatePayload;
    if (
      typeof payload?.t !== "string" ||
      typeof payload?.n !== "string" ||
      typeof payload?.v !== "string" ||
      typeof payload?.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
