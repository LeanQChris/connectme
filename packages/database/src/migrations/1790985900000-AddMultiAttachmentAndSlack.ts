import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMultiAttachmentAndSlack1790985900000 implements MigrationInterface {
  name = "AddMultiAttachmentAndSlack1790985900000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum values if using postgres enums
    await queryRunner.query(`ALTER TYPE "messages_channel_enum" ADD VALUE IF NOT EXISTS 'SLACK'`).catch(() => {});
    await queryRunner.query(`ALTER TYPE "messages_channel_enum" ADD VALUE IF NOT EXISTS 'WIDGET'`).catch(() => {});
    await queryRunner.query(`ALTER TYPE "conversations_channel_enum" ADD VALUE IF NOT EXISTS 'SLACK'`).catch(() => {});
    await queryRunner.query(`ALTER TYPE "conversations_channel_enum" ADD VALUE IF NOT EXISTS 'WIDGET'`).catch(() => {});
    await queryRunner.query(`ALTER TYPE "connected_accounts_channel_enum" ADD VALUE IF NOT EXISTS 'SLACK'`).catch(() => {});
    await queryRunner.query(`ALTER TYPE "connected_accounts_channel_enum" ADD VALUE IF NOT EXISTS 'WIDGET'`).catch(() => {});

    await queryRunner.query(`ALTER TYPE "messages_type_enum" ADD VALUE IF NOT EXISTS 'STICKER'`).catch(() => {});
    await queryRunner.query(`ALTER TYPE "messages_type_enum" ADD VALUE IF NOT EXISTS 'LOCATION'`).catch(() => {});
    await queryRunner.query(`ALTER TYPE "messages_type_enum" ADD VALUE IF NOT EXISTS 'FILE'`).catch(() => {});
    await queryRunner.query(`ALTER TYPE "messages_type_enum" ADD VALUE IF NOT EXISTS 'OTHER'`).catch(() => {});

    // Add media column to messages
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "media" jsonb`);

    // Add new credential columns
    await queryRunner.query(`ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "instagramAppSecretEnc" text`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "slackBotTokenEnc" text`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "slackSigningSecretEnc" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "slackSigningSecretEnc"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "slackBotTokenEnc"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "instagramAppSecretEnc"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "media"`);
  }
}
