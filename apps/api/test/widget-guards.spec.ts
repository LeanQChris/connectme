import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  allowWidgetMessage,
  resetWidgetRateLimits,
  isAllowedWidgetOrigin,
} from "../src/infrastructure/security/widget-guards";

describe("allowWidgetMessage", () => {
  beforeEach(() => resetWidgetRateLimits());
  afterEach(() => resetWidgetRateLimits());

  test("allows up to the budget, then blocks", () => {
    for (let i = 0; i < 3; i++) {
      assert.equal(allowWidgetMessage("visitor:a", 3, 60_000), true, `hit ${i} should pass`);
    }
    assert.equal(allowWidgetMessage("visitor:a", 3, 60_000), false, "4th hit must be blocked");
  });

  test("keeps budgets independent per key", () => {
    for (let i = 0; i < 3; i++) allowWidgetMessage("visitor:a", 3, 60_000);
    assert.equal(allowWidgetMessage("visitor:a", 3, 60_000), false);
    assert.equal(
      allowWidgetMessage("visitor:b", 3, 60_000),
      true,
      "a different visitor must not be starved by another's budget",
    );
  });

  test("lets a blocked visitor send again once the window slides", async () => {
    assert.equal(allowWidgetMessage("visitor:a", 1, 5), true);
    assert.equal(allowWidgetMessage("visitor:a", 1, 5), false);

    // The hits are older than the 5ms window, so they must fall out.
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.equal(allowWidgetMessage("visitor:a", 1, 5), true, "budget must reset after the window");
  });

  test("resetWidgetRateLimits clears recorded hits", () => {
    assert.equal(allowWidgetMessage("visitor:a", 1, 60_000), true);
    assert.equal(allowWidgetMessage("visitor:a", 1, 60_000), false);
    resetWidgetRateLimits();
    assert.equal(allowWidgetMessage("visitor:a", 1, 60_000), true);
  });
});

describe("isAllowedWidgetOrigin", () => {
  const original = process.env.WIDGET_ALLOWED_ORIGINS;

  afterEach(() => {
    if (original === undefined) delete process.env.WIDGET_ALLOWED_ORIGINS;
    else process.env.WIDGET_ALLOWED_ORIGINS = original;
  });

  test("is open when no allowlist is configured", () => {
    delete process.env.WIDGET_ALLOWED_ORIGINS;
    assert.equal(isAllowedWidgetOrigin("https://evil.example"), true);
    assert.equal(isAllowedWidgetOrigin(undefined), true);
  });

  test("allows a configured origin and rejects others", () => {
    process.env.WIDGET_ALLOWED_ORIGINS = "https://app.example.com";
    assert.equal(isAllowedWidgetOrigin("https://app.example.com"), true);
    assert.equal(isAllowedWidgetOrigin("https://app.example.com/"), true, "trailing slash");
    assert.equal(isAllowedWidgetOrigin("https://other.example.com"), false);
    assert.equal(isAllowedWidgetOrigin("https://evil-app.example.com.attacker.io"), false);
  });

  test("a bare hostname entry covers the host and its subdomains", () => {
    process.env.WIDGET_ALLOWED_ORIGINS = "example.com";
    assert.equal(isAllowedWidgetOrigin("https://example.com"), true);
    assert.equal(isAllowedWidgetOrigin("https://shop.example.com"), true);
    assert.equal(isAllowedWidgetOrigin("https://notexample.com"), false);
    assert.equal(isAllowedWidgetOrigin("https://example.com.evil.io"), false);
  });

  test("allows a missing origin, which cannot be verified", () => {
    process.env.WIDGET_ALLOWED_ORIGINS = "https://app.example.com";
    assert.equal(isAllowedWidgetOrigin(undefined), true);
    assert.equal(isAllowedWidgetOrigin(""), true);
  });
});
