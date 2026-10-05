import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWhatsAppTemplates1790987000000 implements MigrationInterface {
  name = "AddWhatsAppTemplates1790987000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "whatsapp_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying(512) NOT NULL,
        "language" character varying(16) NOT NULL DEFAULT 'en_US',
        "category" character varying(32) NOT NULL DEFAULT 'UTILITY',
        "status" character varying(32) NOT NULL DEFAULT 'APPROVED',
        "components" jsonb NOT NULL DEFAULT '[]',
        "rawTemplate" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_whatsapp_templates_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_whatsapp_templates_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_whatsapp_templates_tenant_name_lang" 
      ON "whatsapp_templates" ("tenantId", "name", "language")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_whatsapp_templates_tenant_status" 
      ON "whatsapp_templates" ("tenantId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_templates_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_whatsapp_templates_tenant_name_lang"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "whatsapp_templates"`);
  }
}
