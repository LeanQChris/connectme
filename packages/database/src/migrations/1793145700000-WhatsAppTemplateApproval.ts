import { MigrationInterface, QueryRunner } from "typeorm";

export class WhatsAppTemplateApproval1793145700000 implements MigrationInterface {
  name = "WhatsAppTemplateApproval1793145700000";
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "tenant_credentials" ADD COLUMN IF NOT EXISTS "waBusinessAccountId" varchar`);
    await runner.query(`ALTER TABLE "whatsapp_templates" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);
    // Local samples/drafts were previously labeled approved without Meta proof.
    await runner.query(`UPDATE "whatsapp_templates" SET "status" = 'DRAFT', "updatedAt" = NOW() WHERE "status" = 'APPROVED' AND COALESCE("rawTemplate"->>'id', '') = ''`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "tenant_credentials" DROP COLUMN IF EXISTS "waBusinessAccountId"`);
    // Do not restore the unsafe approval default or relabel existing drafts.
  }
}
