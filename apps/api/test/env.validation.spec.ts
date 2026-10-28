import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateEnv, shouldSynchronize } from "../src/infrastructure/config/env.validation";

const VALID_KEY = "0123456789abcdef0123456789abcdef";

describe("validateEnv", () => {
  test("requires ENCRYPTION_KEY in every environment", () => {
    assert.throws(() => validateEnv({ NODE_ENV: "development" }), /ENCRYPTION_KEY/);
  });

  test("rejects a weak ENCRYPTION_KEY", () => {
    assert.throws(
      () => validateEnv({ NODE_ENV: "development", ENCRYPTION_KEY: "short" }),
      /ENCRYPTION_KEY/,
    );
  });

  test("accepts a minimal development environment", () => {
    const config = { NODE_ENV: "development", ENCRYPTION_KEY: VALID_KEY };
    assert.equal(validateEnv(config), config);
  });

  test("rejects an unknown NODE_ENV", () => {
    assert.throws(
      () => validateEnv({ NODE_ENV: "prod", ENCRYPTION_KEY: VALID_KEY }),
      /NODE_ENV/,
    );
  });

  test("requires auth and CORS config in production", () => {
    assert.throws(
      () => validateEnv({ NODE_ENV: "production", ENCRYPTION_KEY: VALID_KEY }),
      /CORS_ORIGINS|NEXT_PUBLIC_APP_URL/,
    );
    assert.throws(
      () =>
        validateEnv({
          NODE_ENV: "production",
          ENCRYPTION_KEY: VALID_KEY,
          NEXT_PUBLIC_APP_URL: "https://app.example.com",
        }),
      /CLERK_SECRET_KEY/,
    );
  });
});

describe("shouldSynchronize", () => {
  test("never synchronizes in production", () => {
    process.env.NODE_ENV = "production";
    process.env.DB_SYNCHRONIZE = "true";
    assert.equal(shouldSynchronize(), false);
  });

  test("honors the explicit DB_SYNCHRONIZE flag outside production", () => {
    process.env.NODE_ENV = "development";
    process.env.DB_SYNCHRONIZE = "false";
    assert.equal(shouldSynchronize(), false);
    process.env.DB_SYNCHRONIZE = "true";
    assert.equal(shouldSynchronize(), true);
    delete process.env.DB_SYNCHRONIZE;
    delete process.env.NODE_ENV;
  });
});

test("production configuration rejects open widget origins and requires OAuth signing", () => {
  const config = {
    NODE_ENV: "production", ENCRYPTION_KEY: VALID_KEY,
    NEXT_PUBLIC_APP_URL: "https://app.test.local", CLERK_SECRET_KEY: "sk_test_local",
    DATABASE_URL: "postgres://postgres@postgres/test", REDIS_URL: "redis://redis:6379",
    OAUTH_STATE_SECRET: "another-separate-secret-with-32-characters", WIDGET_ALLOWED_ORIGINS: "https://shop.test.local",
  };
  assert.equal(validateEnv(config), config);
  assert.throws(() => validateEnv({ ...config, WIDGET_ALLOWED_ORIGINS: "*" }), /WIDGET_ALLOWED_ORIGINS/);
  assert.throws(() => validateEnv({ ...config, WIDGET_ALLOWED_ORIGINS: " , " }), /WIDGET_ALLOWED_ORIGINS/);
  assert.throws(() => validateEnv({ ...config, OAUTH_STATE_SECRET: "short" }), /OAUTH_STATE_SECRET/);
  assert.throws(() => validateEnv({ ...config, CORS_ORIGINS: "*" }), /CORS_ORIGINS/);
});
