import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "../src/presentation/controllers/health.controller";

describe("HealthController", () => {
  test("reports ok when the database responds", async () => {
    const controller = new HealthController({ query: async () => [{ "?column?": 1 }] } as any);
    const result = await controller.check();
    assert.equal(result.status, "ok");
    assert.equal(result.checks.database, "up");
    assert.equal(typeof result.uptimeSeconds, "number");
  });

  test("returns 503 when the database is down", async () => {
    const controller = new HealthController({
      query: async () => {
        throw new Error("connection refused");
      },
    } as any);

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
