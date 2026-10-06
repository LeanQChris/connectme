import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { AppDataSource } from "@connectme/database";

/**
 * Integration tests that run against a real Postgres.
 *
 * Everything else in this suite is mocked, so repository queries, tenant
 * isolation and the mediaUrl migration are otherwise only ever exercised in
 * production. These tests skip (rather than fail) when no database is reachable
 * so the suite still runs on a machine without one.
 */

const TARGET_MIGRATION = "DropMessageMediaUrl1790988000000";
const TENANT_SLUG = "dbit-tenant";
const CONTACT_EXTERNAL_ID = "DBITEST_CONTACT";

let available = false;
let skipReason = "";

async function run(sql: string, params: unknown[] = []): Promise<any[]> {
  return AppDataSource.query(sql, params);
}

async function columnExists(name: string): Promise<boolean> {
  const rows = await run(
    `SELECT 1 AS present FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = $1`,
    [name],
  );
  return rows.length > 0;
}

async function lastMigrationName(): Promise<string | null> {
  const rows = await run(`SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 1`);
  return rows[0]?.name ?? null;
}

/** Everything these tests create, tagged so cleanup can never touch real data. */
async function seed(): Promise<{ tenantId: string; contactId: string; conversationId: string }> {
  const tenant = await run(
    `INSERT INTO tenants (slug, name) VALUES ($1, 'DBITest') RETURNING id`,
    [TENANT_SLUG],
  );
  const tenantId = tenant[0].id;

  const contact = await run(
    `INSERT INTO contacts ("tenantId", channel, "externalId", name)
     VALUES ($1, 'WIDGET', $2, 'DBI Test') RETURNING id`,
    [tenantId, CONTACT_EXTERNAL_ID],
  );
  const contactId = contact[0].id;

  const conversation = await run(
    `INSERT INTO conversations ("tenantId", "contactId", channel)
     VALUES ($1, $2, 'WIDGET') RETURNING id`,
    [tenantId, contactId],
  );

  return { tenantId, contactId, conversationId: conversation[0].id };
}

/**
 * Legacy-shaped rows: a URL in mediaUrl with media absent, empty, already
 * populated, or — the case that used to be impossible to guard cleanly — a
 * non-array jsonb value, where jsonb_array_length() would raise.
 */
async function seedLegacyMessages(conversationId: string): Promise<void> {
  const rows: Array<[string, string, string | null, unknown, string | null, number | null]> = [
    ["DBITEST_image", "IMAGE", "https://cdn.example/a.jpg", null, "image/jpeg", 101],
    ["DBITEST_document", "DOCUMENT", "https://cdn.example/report.pdf", null, "application/pdf", 202],
    ["DBITEST_text", "TEXT", "https://cdn.example/odd.txt", null, null, null],
    [
      "DBITEST_preexisting",
      "IMAGE",
      "https://cdn.example/keep.jpg",
      '[{"url":"https://cdn.example/already.jpg","type":"image"}]',
      null,
      null,
    ],
    ["DBITEST_empty_array", "IMAGE", "https://cdn.example/empty.jpg", "[]", null, null],
    ["DBITEST_non_array", "IMAGE", "https://cdn.example/weird.jpg", '{"not":"an array"}', null, null],
    ["DBITEST_null_url", "IMAGE", null, null, null, null],
  ];

  let offset = 1;
  for (const [externalId, type, mediaUrl, media, mimeType, size] of rows) {
    await run(
      `INSERT INTO messages
         ("conversationId", "externalId", direction, channel, type, text,
          "mediaUrl", "mediaMimeType", "mediaSize", media, status, "createdAt")
       VALUES ($1, $2, 'INBOUND', 'WIDGET', $3, $4, $5, $6, $7, $8, 'RECEIVED',
               now() - make_interval(hours => $9))`,
      [
        conversationId,
        externalId,
        type,
        externalId === "DBITEST_document" ? "report.pdf" : null,
        mediaUrl,
        mimeType,
        size,
        media,
        offset++,
      ],
    );
  }
}

async function cleanup(): Promise<void> {
  await run(`DELETE FROM messages WHERE "externalId" LIKE 'DBITEST_%'`);
  await run(`DELETE FROM messages WHERE "conversationId" IN (
    SELECT id FROM conversations WHERE "contactId" IN (
      SELECT id FROM contacts WHERE "externalId" = $1))`, [CONTACT_EXTERNAL_ID]);
  await run(`DELETE FROM conversations WHERE "contactId" IN (
    SELECT id FROM contacts WHERE "externalId" = $1)`, [CONTACT_EXTERNAL_ID]);
  await run(`DELETE FROM contacts WHERE "externalId" = $1`, [CONTACT_EXTERNAL_ID]);
  await run(`DELETE FROM tenants WHERE slug = $1`, [TENANT_SLUG]);
}

before(async () => {
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    // Bring the schema in line with the entities before asserting anything.
    await AppDataSource.runMigrations();
    available = true;
  } catch (err) {
    skipReason = `no database reachable: ${(err as Error).message}`;
    if (AppDataSource.isInitialized) await AppDataSource.destroy().catch(() => undefined);
  }
});

after(async () => {
  if (AppDataSource.isInitialized) await AppDataSource.destroy().catch(() => undefined);
});

describe("mediaUrl migration against a real database", () => {
  test("backfills media[] from mediaUrl, then drops the column", async (t) => {
    if (!available) return t.skip(skipReason);

    // The test needs to cycle this specific migration, so it must be the last
    // one applied — otherwise undoLastMigration would revert something else.
    const lastName = await lastMigrationName();
    if (lastName !== TARGET_MIGRATION) {
      return t.skip(`last applied migration is ${lastName}, not ${TARGET_MIGRATION}`);
    }

    await cleanup();
    let undid = false;
    try {
      await AppDataSource.undoLastMigration();
      undid = true;
      assert.equal(
        await columnExists("mediaUrl"),
        true,
        "down() must restore the legacy column",
      );

      const { conversationId } = await seed();
      await seedLegacyMessages(conversationId);

      await AppDataSource.runMigrations();
      undid = false;

      assert.equal(
        await columnExists("mediaUrl"),
        false,
        "up() must drop the column after backfilling",
      );

      const rows: Array<{ externalId: string; media: any }> = await run(
        `SELECT "externalId", media FROM messages WHERE "externalId" LIKE 'DBITEST_%'`,
      );
      const byId = new Map(rows.map((r) => [r.externalId, r.media]));
      assert.equal(rows.length, 7);

      assert.deepEqual(byId.get("DBITEST_image"), {
        url: "https://cdn.example/a.jpg",
        size: 101,
        type: "image",
        mimeType: "image/jpeg",
      });

      const doc = byId.get("DBITEST_document");
      assert.equal(doc.type, "document");
      assert.equal(doc.name, "report.pdf", "a document takes its filename from text");

      // TEXT has no media-kind equivalent, so it degrades to `file`.
      assert.equal(byId.get("DBITEST_text")?.type, "file");

      // An existing array must never be overwritten.
      assert.deepEqual(byId.get("DBITEST_preexisting"), [
        { url: "https://cdn.example/already.jpg", type: "image" },
      ]);

      // Empty and non-array values are both backfilled — and the non-array case
      // must not raise on jsonb_array_length().
      assert.equal(byId.get("DBITEST_empty_array")?.url, "https://cdn.example/empty.jpg");
      assert.equal(byId.get("DBITEST_non_array")?.url, "https://cdn.example/weird.jpg");

      // No URL means nothing to reconstruct.
      assert.equal(byId.get("DBITEST_null_url"), null);
    } finally {
      await cleanup().catch(() => undefined);
      if (undid) {
        // Never leave the schema in its pre-migration state, even on failure.
        await AppDataSource.runMigrations().catch(() => undefined);
      }
    }
  });

  test("down() re-derives mediaUrl from the first attachment", async (t) => {
    if (!available) return t.skip(skipReason);

    const lastName = await lastMigrationName();
    if (lastName !== TARGET_MIGRATION) return t.skip(`last migration is ${lastName}`);

    await cleanup();
    let undid = false;
    try {
      const { conversationId } = await seed();

      // The column does not exist yet, so only the canonical array is stored.
      await run(
        `INSERT INTO messages ("conversationId", "externalId", direction, channel, type, media, status, "createdAt")
         VALUES ($1, 'DBITEST_roundtrip', 'INBOUND', 'WIDGET', 'IMAGE',
                 '[{"url":"https://cdn.example/roundtrip.jpg","type":"image"}]',
                 'RECEIVED', now())`,
        [conversationId],
      );

      // down() re-adds the column and derives it from media[0] — which only
      // works if the row already exists when down() runs.
      await AppDataSource.undoLastMigration();
      undid = true;
      assert.equal(await columnExists("mediaUrl"), true, "down() must restore the column");

      const rows = await run(
        `SELECT "mediaUrl" FROM messages WHERE "externalId" = 'DBITEST_roundtrip'`,
      );
      assert.equal(
        rows[0]?.mediaUrl,
        "https://cdn.example/roundtrip.jpg",
        "down() should restore the single URL from media[0]",
      );
    } finally {
      await cleanup().catch(() => undefined);
      if (undid) await AppDataSource.runMigrations().catch(() => undefined);
    }
  });
});

describe("schema invariants the code depends on", () => {
  test("the (conversationId, externalId) unique index rejects duplicates", async (t) => {
    if (!available) return t.skip(skipReason);

    await cleanup();
    try {
      const { conversationId } = await seed();
      const insert = (externalId: string) =>
        run(
          `INSERT INTO messages ("conversationId", "externalId", direction, channel, type, text, status)
           VALUES ($1, $2, 'INBOUND', 'WIDGET', 'TEXT', 'hi', 'RECEIVED')`,
          [conversationId, externalId],
        );

      await insert("DBITEST_dup");

      // This is the invariant createMessage() relies on when it catches 23505:
      // without it a redelivered webhook would silently insert a second row.
      await assert.rejects(() => insert("DBITEST_dup"), (err: any) => {
        assert.equal(err.code, "23505", `expected unique_violation, got ${err.code}: ${err.message}`);
        return true;
      });

      const count = await run(
        `SELECT count(*)::int AS n FROM messages WHERE "externalId" = 'DBITEST_dup'`,
      );
      assert.equal(count[0].n, 1, "the duplicate must not have been stored");
    } finally {
      await cleanup().catch(() => undefined);
    }
  });

  test("every message belongs to exactly one tenant (no cross-tenant rows)", async (t) => {
    if (!available) return t.skip(skipReason);

    await cleanup();
    try {
      const { tenantId, conversationId } = await seed();
      await run(
        `INSERT INTO messages ("conversationId", "externalId", direction, channel, type, text, status)
         VALUES ($1, 'DBITEST_scoped', 'INBOUND', 'WIDGET', 'TEXT', 'hi', 'RECEIVED')`,
        [conversationId],
      );

      // messages has no tenantId of its own — tenancy resolves through the
      // conversation it belongs to.
      const joined = await run(
        `SELECT c."tenantId" AS found FROM messages m
           JOIN conversations c ON c.id = m."conversationId"
          WHERE m."externalId" = 'DBITEST_scoped'`,
      );
      assert.equal(joined.length, 1);
      assert.equal(
        joined[0].found,
        tenantId,
        "the message must resolve to the tenant that owns its conversation",
      );

      // A different tenant must not see it.
      const other = await run(
        `SELECT count(*)::int AS n FROM messages m
           JOIN conversations c ON c.id = m."conversationId"
          WHERE m."externalId" = 'DBITEST_scoped' AND c."tenantId" <> $1`,
        [tenantId],
      );
      assert.equal(other[0].n, 0, "no other tenant may resolve this message");
    } finally {
      await cleanup().catch(() => undefined);
    }
  });
});
