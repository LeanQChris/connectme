import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { S3PresignService } from "../src/infrastructure/storage/s3-presign.service";

test("S3 verifies size-bound upload signatures and signed deletion", async (t) => {
  const endpoint = process.env.TEST_S3_ENDPOINT;
  if (!endpoint) return t.skip("Run npm run check:storage to verify against an isolated S3 gateway.");
  const saved = { ...process.env };
  Object.assign(process.env, { S3_ENDPOINT: endpoint, S3_BUCKET: "media", S3_REGION: "auto", S3_ACCESS_KEY_ID: "readiness-access", S3_SECRET_ACCESS_KEY: "readiness-secret-key-for-local-testing", S3_PUBLIC_BASE_URL: `${endpoint}/media` });
  const storage = new S3PresignService(); const key = `${randomUUID()}.txt`; const body = "storage-signature-check";
  const signed = storage.presignPut(key, 60, Buffer.byteLength(body));
  try {
    const preflight = await fetch(signed.uploadUrl, { method: "OPTIONS", headers: { Origin: "https://app.connectme.test", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" } });
    assert.ok(preflight.ok);
    assert.ok(preflight.headers.get("access-control-allow-methods")?.includes("PUT"));
    const res = await fetch(signed.uploadUrl, { method: "PUT", body, headers: { Origin: "https://app.connectme.test" } });
    assert.equal(res.status, 200, await res.text());
    assert.equal(res.headers.get("access-control-allow-origin"), "https://app.connectme.test");
    const fetched = await fetch(signed.publicUrl); assert.equal(fetched.status, 200); assert.equal(await fetched.text(), body);
    const wrong = await fetch(signed.uploadUrl, { method: "PUT", body: "wrong-size" }); assert.equal(wrong.status, 403);
  } finally {
    const removed = await fetch(storage.presignDelete(key), { method: "DELETE" }); assert.equal(removed.status, 204);
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});
