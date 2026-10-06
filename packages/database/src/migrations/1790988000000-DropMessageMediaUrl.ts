import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Retire `messages.mediaUrl` in favour of `messages.media[]`.
 *
 * The multi-attachment refactor made the jsonb array canonical, but the single
 * `mediaUrl` column kept being written alongside it, so older rows (and every
 * Messenger/Instagram inbound path) still held their only copy of the URL in
 * `mediaUrl`. Dropping the column without a backfill would strand those URLs.
 *
 * Order matters: backfill first, drop second.
 *
 * The column-existence guard is deliberate. The API runs with `synchronize: true`
 * outside production, and TypeORM drops the column from the entity diff before
 * migrations ever see it — so this migration has to be a no-op when the column
 * is already gone rather than failing on a reference to a missing column.
 */
export class DropMessageMediaUrl1790988000000 implements MigrationInterface {
  name = "DropMessageMediaUrl1790988000000";

  private async hasMediaUrlColumn(queryRunner: QueryRunner): Promise<boolean> {
    const rows = await queryRunner.query(
      `SELECT 1 AS present
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'messages'
          AND column_name = 'mediaUrl'`,
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasMediaUrlColumn(queryRunner))) return;

    // 1. Reconstruct media[] for every row that has a URL but no usable array.
    //    Comparing the *text* form of `type` rather than enum literals matters:
    //    STICKER/LOCATION/FILE were added to messages_type_enum by a later
    //    migration that swallows failures, so a CASE against those literals
    //    would throw if they never landed. Reading the value as text has no
    //    membership requirement and works for an enum or a varchar column.
    //    TEXT/OTHER map to `file` because MEDIA_KINDS has no "text" member.
    //    CASE is also what keeps jsonb_array_length() off non-array values:
    //    it raises on a non-array, and SQL does not guarantee OR short-circuits.
    await queryRunner.query(`
      UPDATE "messages"
      SET "media" = jsonb_strip_nulls(jsonb_build_object(
        'url', "mediaUrl",
        'type', CASE lower("type"::text)
          WHEN 'image'    THEN 'image'
          WHEN 'audio'    THEN 'audio'
          WHEN 'video'    THEN 'video'
          WHEN 'document' THEN 'document'
          WHEN 'sticker'  THEN 'sticker'
          WHEN 'location' THEN 'location'
          WHEN 'file'     THEN 'file'
          ELSE 'file'
        END,
        'name', CASE lower("type"::text)
          WHEN 'document' THEN "text"
          WHEN 'file'     THEN "text"
          ELSE NULL
        END,
        'size', "mediaSize",
        'mimeType', "mediaMimeType"
      ))
      WHERE "mediaUrl" IS NOT NULL
        AND CASE
          WHEN "media" IS NULL THEN true
          WHEN jsonb_typeof("media") <> 'array' THEN true
          ELSE jsonb_array_length("media") = 0
        END
    `);

    // 2. Drop the now-redundant column.
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "mediaUrl"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "mediaUrl" text`);

    if (!(await this.hasMediaUrlColumn(queryRunner))) return;

    // Re-derive the single URL from the first attachment. CASE keeps
    // jsonb_array_length() off non-array values.
    await queryRunner.query(`
      UPDATE "messages"
      SET "mediaUrl" = "media" -> 0 ->> 'url'
      WHERE "mediaUrl" IS NULL
        AND CASE
          WHEN "media" IS NULL THEN false
          WHEN jsonb_typeof("media") = 'array' THEN jsonb_array_length("media") > 0
          ELSE false
        END
    `);
  }
}
