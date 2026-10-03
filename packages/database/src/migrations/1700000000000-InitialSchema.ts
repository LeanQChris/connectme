import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
  name = "InitialSchema1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "connected_accounts_channel_enum" AS ENUM ('WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'TELEGRAM', 'DISCORD');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "conversations_channel_enum" AS ENUM ('WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'TELEGRAM', 'DISCORD');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "conversations_status_enum" AS ENUM ('OPEN', 'CLOSED', 'SNOOZED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "messages_channel_enum" AS ENUM ('WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'TELEGRAM', 'DISCORD');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "messages_direction_enum" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL_NOTE');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "messages_type_enum" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "messages_status_enum" AS ENUM ('RECEIVED', 'SENT', 'DELIVERED', 'READ', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "contacts_channel_enum" AS ENUM ('WHATSAPP', 'MESSENGER', 'INSTAGRAM', 'TELEGRAM', 'DISCORD');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying NOT NULL,
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" character varying(128) NOT NULL,
        "tenantId" uuid NOT NULL,
        "email" character varying NOT NULL,
        "firstName" character varying,
        "lastName" character varying,
        "avatarUrl" character varying,
        "role" character varying NOT NULL DEFAULT 'agent',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "waPhoneNumberId" character varying,
        "waAccessTokenEnc" text,
        "waAppId" character varying,
        "metaAppSecretEnc" text,
        "webhookVerifyToken" character varying,
        "pageAccessTokenEnc" text,
        "telegramTokenEnc" text,
        "discordBotTokenEnc" text,
        "discordPublicKey" character varying,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tenant_credentials_tenant" UNIQUE ("tenantId"),
        CONSTRAINT "PK_tenant_credentials" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "connected_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "channel" "connected_accounts_channel_enum" NOT NULL,
        "provider" character varying NOT NULL,
        "externalId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "avatarUrl" character varying,
        "accessTokenEnc" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_connected_accounts_tenant_channel_external" UNIQUE ("tenantId", "channel", "externalId"),
        CONSTRAINT "PK_connected_accounts" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contacts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "channel" "contacts_channel_enum" NOT NULL,
        "externalId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "avatarUrl" character varying,
        "email" character varying,
        "phoneNumber" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_contacts_tenant_channel_external" UNIQUE ("tenantId", "channel", "externalId"),
        CONSTRAINT "PK_contacts" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contacts_tenant_name" ON "contacts" ("tenantId", "name")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "contactId" uuid NOT NULL,
        "accountId" uuid,
        "channel" "conversations_channel_enum" NOT NULL,
        "status" "conversations_status_enum" NOT NULL DEFAULT 'OPEN',
        "assigneeId" character varying(128),
        "tags" text array NOT NULL DEFAULT '{}',
        "unreadCount" integer NOT NULL DEFAULT 0,
        "lastMessageText" text,
        "lastMessageAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "lastInboundAt" TIMESTAMP WITH TIME ZONE,
        "lastReadAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversations_tenant_status_lastMessageAt" ON "conversations" ("tenantId", "status", "lastMessageAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversations_tenant_channel" ON "conversations" ("tenantId", "channel")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversationId" uuid NOT NULL,
        "externalId" character varying,
        "direction" "messages_direction_enum" NOT NULL,
        "channel" "messages_channel_enum" NOT NULL,
        "type" "messages_type_enum" NOT NULL DEFAULT 'TEXT',
        "text" text,
        "mediaUrl" text,
        "mediaMimeType" character varying,
        "mediaSize" integer,
        "status" "messages_status_enum" NOT NULL DEFAULT 'RECEIVED',
        "authorName" character varying,
        "errorDetail" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_messages_conversation_createdAt" ON "messages" ("conversationId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_messages_conversation_external" ON "messages" ("conversationId", "externalId") WHERE "externalId" IS NOT NULL`,
    );

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users" ADD CONSTRAINT "FK_users_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "tenant_credentials" ADD CONSTRAINT "FK_tenant_credentials_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "connected_accounts" ADD CONSTRAINT "FK_connected_accounts_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "contacts" ADD CONSTRAINT "FK_contacts_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_contact" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_account" FOREIGN KEY ("accountId") REFERENCES "connected_accounts"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_assignee" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_conversation" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "FK_messages_conversation"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "FK_conversations_assignee"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "FK_conversations_account"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "FK_conversations_contact"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "FK_conversations_tenant"`);
    await queryRunner.query(`ALTER TABLE "contacts" DROP CONSTRAINT IF EXISTS "FK_contacts_tenant"`);
    await queryRunner.query(`ALTER TABLE "connected_accounts" DROP CONSTRAINT IF EXISTS "FK_connected_accounts_tenant"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP CONSTRAINT IF EXISTS "FK_tenant_credentials_tenant"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_tenant"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "connected_accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenant_credentials"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "contacts_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "messages_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "messages_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "messages_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "messages_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "conversations_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "conversations_channel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "connected_accounts_channel_enum"`);
  }
}
