import { createECDH } from "node:crypto";

/** Optional feature, but a partial or mismatched key pair must fail at startup. */
export function validateVapidConfig(config: Record<string, unknown>): void {
  const keys = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"];
  if (!keys.some((key) => config[key])) return;
  if (keys.some((key) => !config[key])) throw new Error("Browser push requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT in both API and worker.");
  try {
    const publicKey = String(config.VAPID_PUBLIC_KEY);
    const privateKey = String(config.VAPID_PRIVATE_KEY);
    if (!/^[A-Za-z0-9_-]{87}$/.test(publicKey) || !/^[A-Za-z0-9_-]{43}$/.test(privateKey)) throw new Error();
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privateKey, "base64url"));
    if (ecdh.getPublicKey().toString("base64url") !== publicKey) throw new Error();
    const subject = new URL(String(config.VAPID_SUBJECT));
    if (!["mailto:", "https:"].includes(subject.protocol)) throw new Error();
  } catch { throw new Error("Browser push requires a matching P-256 VAPID key pair and a mailto: or HTTPS contact subject."); }
}
