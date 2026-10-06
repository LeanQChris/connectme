import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException, HttpException } from "@nestjs/common";
import { WidgetController } from "../src/presentation/controllers/widget.controller";
import { resetWidgetRateLimits } from "../src/infrastructure/security/widget-guards";

/**
 * Endpoint wiring for the embeddable widget.
 *
 * `isAllowedWidgetOrigin` and `allowWidgetMessage` are unit-tested on their own;
 * these cases exist to prove the controller actually reads the Origin header and
 * applies the budgets — a mis-wired decorator would leave both controls inert
 * while their unit tests still passed.
 */

function makeController() {
  const created: Array<Record<string, unknown>> = [];
  const contactRepo = {
    upsertContact: async (tenantId: string, channel: string, externalId: string, data: any) => ({
      id: "contact-1",
      tenantId,
      channel,
      externalId,
      name: data?.name,
    }),
    findByExternalId: async () => null,
  };
  const convRepo = {
    findOrCreateForContact: async () => ({ id: "conv-1" }),
    updateLastMessage: async () => undefined,
    findByContactId: async () => null,
  };
  const messageRepo = {
    createMessage: async (_tenantId: string, message: Record<string, unknown>) => {
      created.push(message);
      return { id: `msg-${created.length}`, ...message };
    },
    findMessagesPage: async () => [],
  };
  const realtimeGateway = { broadcastNewMessage: () => undefined } as any;

  const controller = new WidgetController(
    {} as any,
    contactRepo as any,
    convRepo as any,
    messageRepo as any,
    realtimeGateway,
    {} as any,
  );
  return { controller, created };
}

const ALLOWED_ORIGIN = "https://shop.example.com";
const originalAllowlist = process.env.WIDGET_ALLOWED_ORIGINS;

async function sessionFor(controller: WidgetController, origin = ALLOWED_ORIGIN) {
  const res: any = await controller.createSession(origin, { tenantId: "t1" });
  return res.sessionToken as string;
}

describe("widget origin allowlist wiring", () => {
  beforeEach(() => {
    resetWidgetRateLimits();
    process.env.WIDGET_ALLOWED_ORIGINS = ALLOWED_ORIGIN;
  });

  afterEach(() => {
    if (originalAllowlist === undefined) delete process.env.WIDGET_ALLOWED_ORIGINS;
    else process.env.WIDGET_ALLOWED_ORIGINS = originalAllowlist;
    resetWidgetRateLimits();
  });

  test("rejects a session from a disallowed origin", async () => {
    const { controller } = makeController();

    await assert.rejects(
      () => controller.createSession("https://attacker.example", { tenantId: "t1" }),
      (err: unknown) => {
        assert.ok(err instanceof ForbiddenException, "expected 403 Forbidden");
        return true;
      },
    );
  });

  test("accepts a session from the configured origin", async () => {
    const { controller } = makeController();

    const token = await sessionFor(controller);
    assert.ok(token.length > 0, "a session token should be issued");
  });

  test("the session token it issues is accepted by sendMessage", async () => {
    const { controller, created } = makeController();
    const token = await sessionFor(controller);

    await controller.sendMessage(
      `Bearer ${token}`,
      ALLOWED_ORIGIN,
      "203.0.113.10",
      undefined as any,
      { text: "hello" },
    );

    assert.equal(created.length, 1, "the message should be persisted");
    assert.equal(created[0].text, "hello");
  });
});

describe("widget message rate limit wiring", () => {
  const originalAllowlist2 = process.env.WIDGET_ALLOWED_ORIGINS;

  beforeEach(() => {
    delete process.env.WIDGET_ALLOWED_ORIGINS;
    resetWidgetRateLimits();
  });

  afterEach(() => {
    if (originalAllowlist2 === undefined) delete process.env.WIDGET_ALLOWED_ORIGINS;
    else process.env.WIDGET_ALLOWED_ORIGINS = originalAllowlist2;
    resetWidgetRateLimits();
  });

  test("allows the per-visitor budget, then answers 429", async () => {
    const { controller, created } = makeController();
    const token = await sessionFor(controller, "https://any.example");

    let allowed = 0;
    let blocked = 0;
    // Budget is 12/minute per visitor; the 13th must be refused.
    for (let i = 0; i < 13; i++) {
      try {
        await controller.sendMessage(
          `Bearer ${token}`,
          "https://any.example",
          "203.0.113.77",
          undefined as any,
          { text: `msg ${i}` },
        );
        allowed++;
      } catch (err) {
        assert.ok(err instanceof HttpException, `unexpected error: ${err}`);
        assert.equal(err.getStatus(), 429, "rate limit must answer 429, not 500");
        blocked++;
      }
    }

    assert.equal(allowed, 12, "exactly the budget should pass");
    assert.equal(blocked, 1, "the 13th message must be rate limited");
    assert.equal(created.length, 12, "a refused message must not be persisted");
  });

  test("keeps budgets separate per visitor", async () => {
    const { controller } = makeController();
    const first = await sessionFor(controller, "https://any.example");
    const second = await sessionFor(controller, "https://any.example");

    for (let i = 0; i < 13; i++) {
      await controller.sendMessage(
        `Bearer ${first}`,
        "https://any.example",
        "203.0.113.78",
        undefined as any,
        { text: `a${i}` },
      ).catch(() => undefined);
    }

    // Same IP: if budgets were keyed on IP alone this would now be refused.
    await controller.sendMessage(
      `Bearer ${second}`,
      "https://any.example",
      "203.0.113.78",
      undefined as any,
      { text: "fresh visitor" },
    );
  });

  test("limits a single IP across sessions", async () => {
    const { controller } = makeController();

    // Exhaust the per-IP budget (60/min) using distinct visitors from one IP.
    for (let i = 0; i < 60; i++) {
      const token = await sessionFor(controller, "https://any.example");
      await controller
        .sendMessage(`Bearer ${token}`, "https://any.example", "198.51.100.5", undefined as any, {
          text: `burst ${i}`,
        })
        .catch(() => undefined);
    }

    const overflow = await sessionFor(controller, "https://any.example");
    await assert.rejects(
      () =>
        controller.sendMessage(
          `Bearer ${overflow}`,
          "https://any.example",
          "198.51.100.5",
          undefined as any,
          { text: "one too many" },
        ),
      (err: unknown) => {
        assert.ok(err instanceof HttpException);
        assert.equal(err.getStatus(), 429, "the per-IP budget must hold");
        return true;
      },
    );
  });
});
