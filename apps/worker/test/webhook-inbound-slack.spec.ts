import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { WebhookInboundProcessor } from "../src/processors/webhook-inbound.processor";

/**
 * Slack Events API ingestion. These cases pin the behaviour that silently broke
 * during the NestJS port: the API enqueues a "slack" job, so the worker must
 * recognise that name and persist the message. Before this handler existed the
 * job fell through to `default:` and every Slack message was discarded.
 */
function buildProcessor(opts: {
  teamAccount?: { tenantId: string; id: string } | null;
  existingMessage?: boolean;
  label?: { name: string; isDirectMessage: boolean } | null;
  userInfo?: { name?: string; avatarUrl?: string } | null;
  creds?: any;
}) {
  const upsertCalls: Array<{ externalId: string; name: string; avatarUrl?: any }> = [];
  const messageCalls: Array<Record<string, any>> = [];
  const followUps: Array<Record<string, any>> = [];
  const published: any[] = [];

  

  const contactRepo = {
    findOne: async () => null,
    create: (d: any) => d,
    save: async (c: any) => {
      upsertCalls.push({ externalId: c.externalId, name: c.name, avatarUrl: c.avatarUrl });
      return { id: "contact-1", ...c };
    },
  };
  const convRepo = {
    findOne: async () => null,
    create: (d: any) => d,
    save: async (c: any) => ({ id: "conv-1", ...c }),
  };
  const messageRepo = {
    findOne: async () => (opts.existingMessage ? { id: "dup" } : null),
    createQueryBuilder: () => ({
      innerJoin: () => ({
        where: () => ({
          andWhere: () => ({ getOne: async () => (opts.existingMessage ? { id: "dup" } : null) }),
        }),
      }),
    }),
    create: (d: any) => d,
    save: async (m: any) => {
      messageCalls.push(m);
      return { id: "msg-1", ...m };
    },
  };

  const processor: any = new (WebhookInboundProcessor as any)(
    contactRepo,
    convRepo,
    messageRepo,
    { findOne: async () => opts.teamAccount ?? null },
    { findOne: async () => opts.creds ?? { tenantId: "t1", slackBotTokenEnc: "enc" } },
    { decryptStrict: () => "xoxb-token" },
    { getUserInfo: async () => opts.userInfo ?? null, getConversationLabel: async () => opts.label ?? null },
    { publish: async (e: any) => published.push(e) },
    { add: async () => undefined },
    { add: async () => undefined },
  );
  processor.dispatchFollowUps = async (p: any) => followUps.push(p);

  return { processor, upsertCalls, messageCalls, followUps, published };
}

const slackEvent = (over: Record<string, any> = {}) => ({
  type: "event_callback",
  team_id: "T_TEAM",
  event: { channel: "C123", user: "U_ADA", ts: "1700000000.001", text: "hello", ...over },
});

const teamAccount = { tenantId: "t1", id: "acc-1" };

describe("WebhookInboundProcessor Slack ingestion", () => {
  test("routes a slack job instead of dropping it as unknown", async () => {
    const { processor, messageCalls } = buildProcessor({
      teamAccount,
      label: { name: "general", isDirectMessage: false },
    });

    // Mirrors WebhookController.dispatch: job.data.payload holds the envelope.
    await processor.process({ name: "slack", data: { payload: slackEvent() } });

    assert.equal(messageCalls.length, 1);
    assert.equal(messageCalls[0].channel, "SLACK");
    assert.equal(messageCalls[0].text, "hello");
    assert.equal(messageCalls[0].externalId, "1700000000.001");
  });

  test("names a channel conversation after the channel, not the sender", async () => {
    const { processor, upsertCalls, messageCalls } = buildProcessor({
      teamAccount,
      label: { name: "general", isDirectMessage: false },
      userInfo: { name: "Ada Lovelace", avatarUrl: "https://img/ada.png" },
    });

    await processor.process({ name: "slack", data: { payload: slackEvent() } });

    assert.equal(upsertCalls[0].externalId, "C123");
    assert.equal(upsertCalls[0].name, "general");
    assert.equal(upsertCalls[0].avatarUrl, undefined);
    assert.equal(messageCalls[0].authorName, "Ada Lovelace");
  });

  test("names a DM after the counterpart and keeps their avatar", async () => {
    const { processor, upsertCalls } = buildProcessor({
      teamAccount,
      label: { name: "Ada Lovelace", isDirectMessage: true },
      userInfo: { name: "Ada Lovelace", avatarUrl: "https://img/ada.png" },
    });

    await processor.process({ name: "slack", data: { payload: slackEvent({ channel: "D999" }) } });

    assert.equal(upsertCalls[0].name, "Ada Lovelace");
    assert.equal(upsertCalls[0].avatarUrl, "https://img/ada.png");
  });

  test("stores files as media and enqueues a re-host", async () => {
    const { processor, messageCalls, followUps } = buildProcessor({
      teamAccount,
      label: { name: "general", isDirectMessage: false },
    });

    await processor.process({
      name: "slack",
      data: {
        payload: slackEvent({
          files: [{ url_private: "https://files.slack.com/x.png", name: "shot.png", mimetype: "image/png", size: 12 }],
        }),
      },
    });

    // The conversation message stores media[]; the retired mediaUrl column is gone.
    assert.equal(messageCalls[0].media[0].url, "https://files.slack.com/x.png");
    assert.equal(messageCalls[0].media.length, 1);
    // Re-host job data still carries the download source URL.
    assert.equal(followUps[0].mediaUrl, "https://files.slack.com/x.png");
  });

  test("drops events for an unregistered workspace", async () => {
    const { processor, messageCalls } = buildProcessor({ teamAccount: null });

    await processor.process({ name: "slack", data: { payload: slackEvent() } });

    assert.equal(messageCalls.length, 0);
  });

  test("ignores bot messages to avoid echo loops", async () => {
    const { processor, messageCalls } = buildProcessor({ teamAccount });

    await processor.process({ name: "slack", data: { payload: slackEvent({ bot_id: "B1", subtype: "bot_message" }) } });

    assert.equal(messageCalls.length, 0);
  });

  test("ignores duplicate events (Slack retries hard)", async () => {
    const { processor, messageCalls } = buildProcessor({
      teamAccount,
      existingMessage: true,
      label: { name: "general", isDirectMessage: false },
    });

    await processor.process({ name: "slack", data: { payload: slackEvent() } });

    assert.equal(messageCalls.length, 0);
  });

  test("still ingests when no Slack credentials are configured", async () => {
    const { processor, messageCalls } = buildProcessor({
      teamAccount,
      creds: { tenantId: "t1", slackBotTokenEnc: null },
    });

    await processor.process({ name: "slack", data: { payload: slackEvent() } });

    assert.equal(messageCalls.length, 1);
    // Falls back to the channel id, since no label can be resolved.
    assert.equal(messageCalls[0].text, "hello");
  });

  test("still rejects genuinely unknown job names", async () => {
    const { processor, messageCalls } = buildProcessor({ teamAccount });

    await processor.process({ name: "carrier-pigeon", data: {} });

    assert.equal(messageCalls.length, 0);
  });
});