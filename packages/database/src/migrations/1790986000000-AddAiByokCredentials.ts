import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAiByokCredentials1790986000000 implements MigrationInterface {
  name = "AddAiByokCredentials1790986000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiApiKeyEnc" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiProvider" character varying DEFAULT 'openai'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiModel" character varying DEFAULT 'gpt-4o-mini'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiCustomBaseUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiCustomSystemPrompt" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiFallbackApiKeyEnc" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiFallbackProvider" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiFallbackModel" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiRoutingStrategy" character varying DEFAULT 'priority'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiRoutingStrategy"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiFallbackModel"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiFallbackProvider"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiFallbackApiKeyEnc"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiCustomSystemPrompt"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiCustomBaseUrl"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiModel"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiProvider"`);
    await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiApiKeyEnc"`);
  }
}
