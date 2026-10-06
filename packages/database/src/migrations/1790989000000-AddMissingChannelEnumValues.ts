import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Add SLACK and WIDGET to the three channel enums that never received them.
 *
 * `ChannelType` declares seven members, and 1790985900000-AddMultiAttachmentAndSlack
 * added SLACK/WIDGET to messages, conversations and connected_accounts — but
 * missed contacts and both scheduled tables.
 *
 * This only bites a database built from migrations. A dev database created by
 * TypeORM `synchronize` derives the enums from the entity, so it has all seven
 * and the bug stays invisible until production. There, the failure is total for
 * two channels:
 *
 *   - widget: `createSession` upserts a contact with channel WIDGET, so the
 *     embeddable widget cannot open a session at all;
 *   - slack: inbound Slack ingestion upserts a contact with channel SLACK;
 *   - scheduling: both scheduled tables reject slack/widget, although the API
 *     accepts them as schedulable channels.
 *
 * `ALTER TYPE ... ADD VALUE` cannot remove a value later, so `down()` is
 * deliberately a no-op: reverting would either be impossible or break rows that
 * already use the added values.
 */
export class AddMissingChannelEnumValues1790989000000 implements MigrationInterface {
  name = "AddMissingChannelEnumValues1790989000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const typeName of [
      "contacts_channel_enum",
      "scheduled_messages_channel_enum",
      "scheduled_posts_channel_enum",
    ]) {
      // IF NOT EXISTS keeps this idempotent for databases where synchronize
      // already created the full set from the entity.
      await queryRunner.query(`ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'SLACK'`);
      await queryRunner.query(`ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'WIDGET'`);
    }
  }

  public async down(): Promise<void> {
    // Postgres provides no ALTER TYPE ... DROP VALUE, and dropping would break
    // any row already using SLACK or WIDGET. Reverting is intentionally empty.
  }
}
