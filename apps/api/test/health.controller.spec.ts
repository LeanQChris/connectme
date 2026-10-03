import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "../src/presentation/controllers/health.controller";

const redisUp = { ping: async () => true } as any;
const redisDown = {
  ping: async () => {
    throw new Error("connection refused");
  },
} as any;

describe("HealthController", () => {
  test("reports ok when the database and redis respond", async () => {
    const controller = new HealthController(
      { query: async () => [{ "?column?": 1 }] } as any,
      redisUp,
    );
    const result = await controller.check();
    assert.equal(result.status, "ok");
    assert.equal(result.checks.database, "up");
    assert.equal(result.checks.redis, "up");
    assert.equal(typeof result.uptimeSeconds, "number");
  });

  test("reports degraded (200) when redis is down", async () => {
    const controller = new HealthController(
      { query: async () => [{ "?column?": 1 }] } as any,
      redisDown,
    );
    const result = await controller.check();
    assert.equal(result.status, "degraded");
    assert.equal(result.checks.redis, "down");
  });

  test("returns 503 when the database is down", async () => {
    const controller = new HealthController(
      {
        query: async () => {
          throw new Error("connection refused");
        },
      } as any,
      redisUp,
    );

    await assert.rejects(
      () => controller.check(),
      (err) => {
        assert.ok(err instanceof ServiceUnavailableException);
        assert.equal((err.getResponse() as { status: string }).status, "degraded");
        return true;
      },
    );
  });
});
