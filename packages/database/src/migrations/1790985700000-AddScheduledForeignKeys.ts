import { MigrationInterface, QueryRunner } from "typeorm";

export class AddScheduledForeignKeys1790985700000 implements MigrationInterface {
  name = "AddScheduledForeignKeys1790985700000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "scheduled_posts" ADD CONSTRAINT "FK_scheduled_posts_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "scheduled_posts" ADD CONSTRAINT "FK_scheduled_posts_account" FOREIGN KEY ("accountId") REFERENCES "connected_accounts"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "scheduled_messages" ADD CONSTRAINT "FK_scheduled_messages_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "scheduled_messages" ADD CONSTRAINT "FK_scheduled_messages_conversation" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "scheduled_messages" DROP CONSTRAINT IF EXISTS "FK_scheduled_messages_conversation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scheduled_messages" DROP CONSTRAINT IF EXISTS "FK_scheduled_messages_tenant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scheduled_posts" DROP CONSTRAINT IF EXISTS "FK_scheduled_posts_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "scheduled_posts" DROP CONSTRAINT IF EXISTS "FK_scheduled_posts_tenant"`,
    );
  }
}
