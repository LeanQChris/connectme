import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "../src/presentation/controllers/health.controller";

const dbUp = { query: async () => [{ "?column?": 1 }] } as any;
const dbDown = {
  query: async () => {
    throw new Error("connection refused");
  },
} as any;
const dbHangs = { query: () => new Promise(() => {}) } as any;

const redisUp = { ping: async () => true } as any;
const redisFalsy = { ping: async () => false } as any;
const redisDown = {
  ping: async () => {
    throw new Error("connection refused");
  },
} as any;

describe("HealthController liveness", () => {
  test("is ok without touching the database or redis", async () => {
    // Both dependencies throw if called — liveness must not call them.
    const controller = new HealthController(
      {
        query: async () => {
          throw new Error("liveness must not query the database");
        },
      } as any,
      {
        ping: async () => {
          throw new Error("liveness must not ping redis");
        },
      } as any,
    );

    const result = controller.live();
    assert.equal(result.status, "ok");
    assert.equal(typeof result.uptimeSeconds, "number");
  });

  test("stays ok when the database is down — the regression this route exists for", () => {
    const controller = new HealthController(dbDown, redisUp);
    assert.equal(controller.live().status, "ok");
  });
});

describe("HealthController readiness", () => {
  test("reports ok when the database and redis respond", async () => {
    const controller = new HealthController(dbUp, redisUp);
    const result = await controller.ready();
    assert.equal(result.status, "ok");
    assert.equal(result.checks.database, "up");
    assert.equal(result.checks.redis, "up");
    assert.equal(typeof result.uptimeSeconds, "number");
  });

  test("reports degraded (200) when redis is down", async () => {
    const controller = new HealthController(dbUp, redisDown);
    const result = await controller.ready();
    assert.equal(result.status, "degraded");
    assert.equal(result.checks.redis, "down");
  });

  test("reports degraded when redis answers falsy", async () => {
    const controller = new HealthController(dbUp, redisFalsy);
    const result = await controller.ready();
    assert.equal(result.checks.redis, "down");
  });

  test("returns 503 when the database is down", async () => {
    const controller = new HealthController(dbDown, redisUp);

    await assert.rejects(
      () => controller.ready(),
      (err) => {
        assert.ok(err instanceof ServiceUnavailableException);
        assert.equal((err.getResponse() as { status: string }).status, "degraded");
        return true;
      },
    );
  });

  test("fails fast when a probe hangs instead of blocking readiness", async () => {
    const controller = new HealthController(dbHangs, redisUp);

    await assert.rejects(
      () => controller.ready(),
      ServiceUnavailableException,
      "a hanging database connection should time out and report 503",
    );
  });
});

describe("HealthController legacy alias", () => {
  test("GET /api/health keeps its existing readiness semantics", async () => {
    const controller = new HealthController(dbUp, redisUp);
    const result = await controller.check();
    assert.equal(result.status, "ok");

    const failing = new HealthController(dbDown, redisUp);
    await assert.rejects(() => failing.check(), ServiceUnavailableException);
  });
});
