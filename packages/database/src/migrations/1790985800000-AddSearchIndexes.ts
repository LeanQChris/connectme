import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSearchIndexes1790985800000 implements MigrationInterface {
  name = "AddSearchIndexes1790985800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contacts_name_trgm" ON "contacts" USING gin ("name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contacts_external_trgm" ON "contacts" USING gin ("externalId" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_messages_text_trgm" ON "messages" USING gin ("text" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversations_lastMessageText_trgm" ON "conversations" USING gin ("lastMessageText" gin_trgm_ops)`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_conversations_tenant_lastMessageAt" ON "conversations" ("tenantId", "lastMessageAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_messages_conversation_createdAt_desc" ON "messages" ("conversationId", "createdAt" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_messages_conversation_createdAt_desc"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversations_tenant_lastMessageAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_conversations_lastMessageText_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_messages_text_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contacts_external_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contacts_name_trgm"`);
  }
}
