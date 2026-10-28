import { MigrationInterface, QueryRunner } from "typeorm";

export class SecureWorkspaceMembership1793145600000 implements MigrationInterface {
  name = "SecureWorkspaceMembership1793145600000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "disabledAt" timestamptz`);
    // Legacy invitations were placeholder users and never authenticated members.
    await queryRunner.query(`UPDATE "users" SET "disabledAt" = NOW() WHERE LEFT("id", 9) = 'user_inv_'`);
    // Older onboarding created admins, leaving workspaces without an owner.
    await queryRunner.query(`
      UPDATE "users" u SET "role" = 'owner'
      FROM (
        SELECT DISTINCT ON ("tenantId") "id", "tenantId" FROM "users"
        WHERE "role" = 'admin' AND "disabledAt" IS NULL
          AND NOT EXISTS (SELECT 1 FROM "users" o WHERE o."tenantId" = "users"."tenantId" AND o."role" = 'owner' AND o."disabledAt" IS NULL)
        ORDER BY "tenantId", "createdAt", "id"
      ) candidate WHERE u."id" = candidate."id"
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    // Keep roles as-is; rolling back must not remove a workspace's only owner.
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "disabledAt"`);
  }
}
