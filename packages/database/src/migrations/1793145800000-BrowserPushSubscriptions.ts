import { MigrationInterface, QueryRunner } from "typeorm";
export class BrowserPushSubscriptions1793145800000 implements MigrationInterface {
  name = "BrowserPushSubscriptions1793145800000";
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE IF NOT EXISTS "browser_push_subscriptions" (
      "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
      "userId" varchar(128) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "endpointHash" varchar(64) NOT NULL,
      "subscriptionEnc" text NOT NULL, "vapidPublicKey" varchar(128) NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_tenant_endpoint" ON "browser_push_subscriptions" ("tenantId", "endpointHash")`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "IDX_push_tenant_user" ON "browser_push_subscriptions" ("tenantId", "userId")`);
  }
  async down(runner: QueryRunner): Promise<void> { await runner.query(`DROP TABLE IF EXISTS "browser_push_subscriptions"`); }
}
