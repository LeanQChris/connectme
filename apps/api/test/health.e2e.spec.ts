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

const dbThrows = async () => {
  throw new Error("db connection refused");
};
const dbOk = async () => [{ ok: 1 }];
const redisOk = async () => true;
const redisThrows = async () => {
  throw new Error("redis connection refused");
};

describe("HealthController (HTTP E2E)", () => {
  test("GET /api/health/live returns 200 with no dependency healthy", async () => {
    // Both dependencies are broken: liveness must still report 200 so a restart
    // policy does not kill healthy instances during a dependency outage.
    const app = await buildApp(dbThrows, redisThrows);

    const res = await request(app.getHttpServer()).get("/api/health/live").expect(200);

    assert.equal(res.body.status, "ok");
    assert.equal(typeof res.body.uptimeSeconds, "number");
    assert.equal(res.body.checks, undefined, "liveness must not report dependency checks");

    await app.close();
  });

  test("GET /api/health/ready returns 200 ok and echoes a correlation id", async () => {
    const app = await buildApp(dbOk, redisOk);

    const res = await request(app.getHttpServer()).get("/api/health/ready").expect(200);

    assert.equal(res.body.status, "ok");
    assert.equal(res.body.checks.database, "up");
    assert.equal(res.body.checks.redis, "up");
    assert.ok(res.headers["x-request-id"]);

    await app.close();
  });

  test("GET /api/health/ready returns 200 degraded when redis is down", async () => {
    const app = await buildApp(dbOk, redisThrows);

    const res = await request(app.getHttpServer()).get("/api/health/ready").expect(200);

    assert.equal(res.body.status, "degraded");
    assert.equal(res.body.checks.redis, "down");

    await app.close();
  });

  test("GET /api/health/ready returns 503 when the database is down", async () => {
    const app = await buildApp(dbThrows, redisOk);

    const res = await request(app.getHttpServer()).get("/api/health/ready").expect(503);

    assert.equal(res.body.statusCode, 503);
    assert.equal(res.body.error, "ServiceUnavailableException");

    await app.close();
  });

  test("liveness and readiness diverge exactly when they should", async () => {
    const app = await buildApp(dbThrows, redisOk);

    await request(app.getHttpServer()).get("/api/health/live").expect(200);
    await request(app.getHttpServer()).get("/api/health/ready").expect(503);

    await app.close();
  });

  test("GET /api/health still aliases readiness for existing probes", async () => {
    const app = await buildApp(dbOk, redisOk);

    const res = await request(app.getHttpServer()).get("/api/health").expect(200);
    assert.equal(res.body.status, "ok");
    assert.ok(res.headers["x-request-id"]);

    await app.close();
  });

  test("GET /api/health still returns 503 when the database is down", async () => {
    const app = await buildApp(dbThrows, redisOk);

    await request(app.getHttpServer()).get("/api/health").expect(503);

    await app.close();
  });
});
