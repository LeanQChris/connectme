import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { parse } from "dotenv";
import { validateEnv } from "../apps/api/src/infrastructure/config/env.validation";
import { S3PresignService } from "../apps/api/src/infrastructure/storage/s3-presign.service";

async function main() {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf("--env-file");
  const envFile = resolve(fileIndex >= 0 ? args[fileIndex + 1] || "" : ".env.production");
  const problems: string[] = [];
  let config: Record<string, string>;
  try {
    config = parse(readFileSync(envFile));
  } catch {
    console.error(`Production configuration is missing: ${envFile}. Prepare it from .env.production.example when deploying.`);
    process.exit(1);
  }
  const required = (key: string, minimum = 1) => {
    const value = config[key]?.trim() || "";
    if (value.length < minimum || /example\.com|replace[_-]?me|changeme|fake|^your[_-]/i.test(value)) problems.push(`${key} needs a real value${minimum > 1 ? ` (at least ${minimum} characters)` : ""}.`);
  };
  for (const key of ["APP_DOMAIN", "ACME_EMAIL", "POSTGRES_USER", "POSTGRES_DB", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "WIDGET_ALLOWED_ORIGINS", "S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_BASE_URL", "BACKUP_REPOSITORY"]) required(key);
  for (const key of ["POSTGRES_PASSWORD", "ENCRYPTION_KEY", "OAUTH_STATE_SECRET", "BACKUP_PASSWORD"]) required(key, 32);
  if (!/^[a-z0-9_-]{32,}$/i.test(config.POSTGRES_PASSWORD || "")) problems.push("POSTGRES_PASSWORD must be URL-safe; use openssl rand -hex 32.");
  for (const key of ["POSTGRES_USER", "POSTGRES_DB"]) if (!/^[a-z0-9_-]+$/i.test(config[key] || "")) problems.push(`${key} must use letters, numbers, underscores, or hyphens.`);
  try {
    const backupUrl = new URL((config.BACKUP_REPOSITORY || "").replace(/^s3:/, ""));
    if (backupUrl.hostname === new URL(config.S3_ENDPOINT).hostname && backupUrl.pathname.split("/")[1] === config.S3_BUCKET) problems.push("Use a separate private bucket for backups, not the public media bucket.");
  } catch { /* The repository format is checked below. */ }
  if (new Set([config.ENCRYPTION_KEY, config.OAUTH_STATE_SECRET, config.POSTGRES_PASSWORD, config.BACKUP_PASSWORD]).size !== 4) problems.push("Use separate encryption, OAuth, database, and backup secrets.");
  const staging = args.includes("--staging");
  if (!config.CLERK_SECRET_KEY?.startsWith(staging ? "sk_test_" : "sk_live_")) problems.push(`CLERK_SECRET_KEY must be a ${staging ? "test" : "live"} key.`);
  if (!config.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith(staging ? "pk_test_" : "pk_live_")) problems.push(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be a ${staging ? "test" : "live"} key.`);
  for (const key of ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_API_URL", "S3_ENDPOINT", "S3_PUBLIC_BASE_URL"]) {
    try {
      const url = new URL(config[key]);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
      if (key.startsWith("NEXT_PUBLIC") && (url.host !== config.APP_DOMAIN || url.pathname !== "/" || url.search || url.hash)) throw new Error();
    } catch { problems.push(`${key} must be a valid HTTPS URL${key.startsWith("NEXT_PUBLIC") ? " at APP_DOMAIN" : ""}.`); }
  }
  if (!/^s3:https:\/\//.test(config.BACKUP_REPOSITORY || "")) problems.push("BACKUP_REPOSITORY must be a separate private S3/R2 restic repository (s3:https://endpoint/bucket).");
  for (const key of ["BACKUP_ACCESS_KEY_ID", "BACKUP_SECRET_ACCESS_KEY"]) required(key);
  try {
    validateEnv({ ...config, NODE_ENV: "production", DATABASE_URL: `postgres://${encodeURIComponent(config.POSTGRES_USER)}:${encodeURIComponent(config.POSTGRES_PASSWORD)}@postgres:5432/${encodeURIComponent(config.POSTGRES_DB)}` });
  } catch (error) { problems.push(error instanceof Error ? error.message : "Invalid API settings."); }
  if (problems.length) {
    console.error(`Production configuration needs ${problems.length} change(s):\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
    process.exit(1);
  }
  // Validate Compose without printing its interpolated secrets.
  const compose = spawnSync("docker", ["compose", "--env-file", envFile, "-f", "docker-compose.prod.yml", "config", "--quiet"], { env: { ...process.env, CONNECTME_ENV_FILE: envFile }, encoding: "utf8" });
  if (compose.status !== 0) {
    console.error("Docker Compose validation failed. Check Docker availability and required production settings.");
    process.exit(1);
  }
  if (args.includes("--verify-storage")) {
    Object.assign(process.env, config);
    const storage = new S3PresignService();
    const key = `readiness/${randomUUID()}.txt`;
    const content = "connectme-storage-check";
    const signed = storage.presignPut(key, 60, Buffer.byteLength(content));
    try {
      const preflight = await fetch(signed.uploadUrl, { method: "OPTIONS", headers: { Origin: config.NEXT_PUBLIC_APP_URL, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" }, signal: AbortSignal.timeout(15_000) });
      if (!preflight.ok || !preflight.headers.get("access-control-allow-methods")?.includes("PUT")) throw new Error("Bucket CORS does not allow browser PUT uploads.");
      const uploaded = await fetch(signed.uploadUrl, { method: "PUT", headers: { "Content-Type": "text/plain", Origin: config.NEXT_PUBLIC_APP_URL }, body: content, signal: AbortSignal.timeout(15_000) });
      if (!uploaded.ok) throw new Error(`Storage upload returned HTTP ${uploaded.status}.`);
      const allowed = uploaded.headers.get("access-control-allow-origin");
      if (allowed !== config.NEXT_PUBLIC_APP_URL && allowed !== "*") throw new Error("Bucket CORS does not allow the app origin.");
      const downloaded = await fetch(signed.publicUrl, { signal: AbortSignal.timeout(15_000) });
      if (!downloaded.ok || await downloaded.text() !== content) throw new Error("Uploaded media is not publicly readable by providers.");
      console.log("Signed media upload, bucket CORS, and public download passed.");
    } finally {
      const removed = await fetch(storage.presignDelete(key), { method: "DELETE", signal: AbortSignal.timeout(15_000) });
      if (!removed.ok) throw new Error("Could not remove the storage verification object.");
    }
  }
  console.log(`Production configuration and Compose passed${staging ? " for staging with test Clerk keys" : ""}. Provider App Review and a restore drill remain deployment checks.`);
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Production verification failed.");
  process.exitCode = 1;
});
