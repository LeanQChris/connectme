import { Injectable, Logger } from "@nestjs/common";
import { createHash, createHmac } from "crypto";

/**
 * Minimal AWS SigV4 uploader for S3-compatible storage (Cloudflare R2, AWS S3,
 * MinIO). Worker-local copy of the API presign service so the worker does not
 * depend on `apps/api`.
 *
 * Required env: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
 * Optional: S3_REGION (default "auto"), S3_PUBLIC_BASE_URL, S3_PRESIGN_EXPIRES.
 */
@Injectable()
export class S3MediaService {
  private readonly logger = new Logger(S3MediaService.name);

  isConfigured(): boolean {
    return Boolean(
      process.env.S3_ENDPOINT &&
        process.env.S3_BUCKET &&
        process.env.S3_ACCESS_KEY_ID &&
        process.env.S3_SECRET_ACCESS_KEY,
    );
  }

  async uploadBuffer(
    key: string,
    body: Buffer,
    contentType = "application/octet-stream",
  ): Promise<string> {
    const { uploadUrl, publicUrl } = this.presignPut(key);
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: new Uint8Array(body),
    });
    if (!res.ok) {
      throw new Error(`Failed to store media (HTTP ${res.status}).`);
    }
    return publicUrl;
  }

  private presignPut(key: string, expiresSeconds = 900): {
    uploadUrl: string;
    publicUrl: string;
  } {
    const endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, "");
    const url = new URL(endpoint);
    const host = url.host;
    const bucket = process.env.S3_BUCKET!;
    const region = process.env.S3_REGION || "auto";
    const service = "s3";
    const accessKey = process.env.S3_ACCESS_KEY_ID!;
    const secretKey = process.env.S3_SECRET_ACCESS_KEY!;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const canonicalUri = `/${bucket}/${key
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/")}`;

    const params: Array<[string, string]> = [
      ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
      ["X-Amz-Credential", `${accessKey}/${credentialScope}`],
      ["X-Amz-Date", amzDate],
      ["X-Amz-Expires", String(expiresSeconds)],
      ["X-Amz-SignedHeaders", "host"],
    ];
    const canonicalQuery = params
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .sort()
      .join("&");

    const canonicalRequest = [
      "PUT",
      canonicalUri,
      canonicalQuery,
      `host:${host}\n`,
      "host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      this.sha256Hex(canonicalRequest),
    ].join("\n");

    const signingKey = this.signingKey(secretKey, dateStamp, region, service);
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    const uploadUrl = `${endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
    const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
    const publicUrl = publicBase ? `${publicBase}/${key}` : `${endpoint}/${bucket}/${key}`;

    return { uploadUrl, publicUrl };
  }

  private sha256Hex(data: string): string {
    return createHash("sha256").update(data, "utf8").digest("hex");
  }

  private signingKey(secret: string, dateStamp: string, region: string, service: string) {
    const kDate = createHmac("sha256", `AWS4${secret}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(region).digest();
    const kService = createHmac("sha256", kRegion).update(service).digest();
    return createHmac("sha256", kService).update("aws4_request").digest();
  }
}
