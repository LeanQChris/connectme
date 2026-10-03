import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getDataSourceToken } from "@nestjs/typeorm";
import request from "supertest";
import { HealthController } from "../src/presentation/controllers/health.controller";
import { RedisService } from "../src/infrastructure/redis/redis.service";
import { createHttpTestApp } from "./support/http-app";

function buildApp(
  query: () => Promise<unknown>,
  ping: () => Promise<boolean>,
) {
  return createHttpTestApp({
    controllers: [HealthController],
    providers: [
      { provide: getDataSourceToken(), useValue: { query } },
      { provide: RedisService, useValue: { ping } },
    ],
  });
}

describe("HealthController (HTTP E2E)", () => {
  test("GET /api/health returns 200 ok and echoes a correlation id", async () => {
    const app = await buildApp(
      async () => [{ ok: 1 }],
      async () => true,
    );

    const res = await request(app.getHttpServer()).get("/api/health").expect(200);

    assert.equal(res.body.status, "ok");
    assert.equal(res.body.checks.database, "up");
    assert.equal(res.body.checks.redis, "up");
    assert.ok(res.headers["x-request-id"]);

    await app.close();
  });

  test("GET /api/health returns 200 degraded when redis is down", async () => {
    const app = await buildApp(
      async () => [{ ok: 1 }],
      async () => {
        throw new Error("redis connection refused");
      },
    );

    const res = await request(app.getHttpServer()).get("/api/health").expect(200);

    assert.equal(res.body.status, "degraded");
    assert.equal(res.body.checks.redis, "down");

    await app.close();
  });

  test("GET /api/health returns 503 when the database is down", async () => {
    const app = await buildApp(
      async () => {
        throw new Error("db connection refused");
      },
      async () => true,
    );

    const res = await request(app.getHttpServer()).get("/api/health").expect(503);

    assert.equal(res.body.statusCode, 503);
    assert.equal(res.body.error, "ServiceUnavailableException");

    await app.close();
  });
});
