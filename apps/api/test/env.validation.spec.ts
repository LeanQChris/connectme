import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateEnv } from "../src/infrastructure/config/env.validation";

describe("validateEnv", () => {
  test("requires ENCRYPTION_KEY in every environment", () => {
    assert.throws(() => validateEnv({ NODE_ENV: "development" }), /ENCRYPTION_KEY/);
  });

  test("accepts a minimal development environment", () => {
    const config = { NODE_ENV: "development", ENCRYPTION_KEY: "key" };
    assert.equal(validateEnv(config), config);
  });

  test("requires auth and CORS config in production", () => {
    assert.throws(
      () => validateEnv({ NODE_ENV: "production", ENCRYPTION_KEY: "key" }),
      /CORS_ORIGINS|NEXT_PUBLIC_APP_URL/,
    );
    assert.throws(
      () =>
        validateEnv({
          NODE_ENV: "production",
          ENCRYPTION_KEY: "key",
          NEXT_PUBLIC_APP_URL: "https://app.example.com",
        }),
      /CLERK_SECRET_KEY/,
    );
  });
});
