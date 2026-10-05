import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAiAutoReply1790986100000 implements MigrationInterface {
  name = "AddAiAutoReply1790986100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiAutoReplyEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "aiAutoReplyPrompt" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiAutoReplyPrompt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "aiAutoReplyEnabled"`,
    );
  }
}
