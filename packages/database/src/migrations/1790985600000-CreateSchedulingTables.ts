import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSchedulingTables1790985600000 implements MigrationInterface {
  name = "CreateSchedulingTables1790985600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "scheduled_posts_channel_enum" AS ENUM ('WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'TELEGRAM', 'DISCORD');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "scheduled_posts_status_enum" AS ENUM ('PENDING', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'CANCELED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "scheduled_posts_mode_enum" AS ENUM ('NATIVE', 'LOCAL');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "scheduled_messages_channel_enum" AS ENUM ('WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'TELEGRAM', 'DISCORD');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "scheduled_messages_status_enum" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduled_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "accountId" uuid,
        "channel" "scheduled_posts_channel_enum" NOT NULL,
        "kind" character varying NOT NULL DEFAULT 'TEXT',
        "caption" text,
        "mediaUrls" text array NOT NULL DEFAULT '{}',
        "scheduledFor" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "scheduled_posts_status_enum" NOT NULL DEFAULT 'PENDING',
        "mode" "scheduled_posts_mode_enum" NOT NULL DEFAULT 'LOCAL',
        "platformContainerId" character varying,
        "platformPostId" character varying,
        "externalUrl" character varying,
        "attempts" integer NOT NULL DEFAULT 0,
        "lastError" text,
        "createdBy" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduled_posts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_scheduled_posts_status_scheduledFor" ON "scheduled_posts" ("status", "scheduledFor")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_scheduled_posts_tenant_status" ON "scheduled_posts" ("tenantId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_scheduled_posts_account" ON "scheduled_posts" ("accountId")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduled_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "conversationId" uuid NOT NULL,
        "channel" "scheduled_messages_channel_enum" NOT NULL,
        "text" text,
        "mediaUrl" text,
        "mediaType" character varying,
        "scheduledFor" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "scheduled_messages_status_enum" NOT NULL DEFAULT 'PENDING',
        "attempts" integer NOT NULL DEFAULT 0,
        "lastError" text,
        "externalId" character varying,
        "createdBy" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduled_messages" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_scheduled_messages_status_scheduledFor" ON "scheduled_messages" ("status", "scheduledFor")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_scheduled_messages_tenant_status" ON "scheduled_messages" ("tenantId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_scheduled_messages_conversation" ON "scheduled_messages" ("conversationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_posts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "scheduled_messages_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "scheduled_messages_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "scheduled_posts_mode_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "scheduled_posts_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "scheduled_posts_channel_enum"`);
  }
}