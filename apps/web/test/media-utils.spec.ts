import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolveMediaUrl } from "../core/utils/media";

/**
 * Slack serves files from private URLs that require an Authorization header,
 * which browsers cannot attach to <img>/<video>/<audio> or a download link.
 * These URLs must be rewritten through the API proxy, and nothing else should
 * be touched.
 */
const SLACK_URL = "https://files.slack.com/files-pri/T1-F1/abc123/shot.png";

describe("resolveMediaUrl", () => {
  test("rewrites Slack private files through the API proxy", () => {
    const out = resolveMediaUrl(SLACK_URL);
    assert.ok(out.startsWith("/api/media/slack?"), `expected proxy URL, got ${out}`);
    assert.equal(new URL(out, "http://x").searchParams.get("url"), SLACK_URL);
  });

  test("rewrites based on the message channel even for an unusual host", () => {
    const out = resolveMediaUrl("https://cdn.example.com/a.png", { channel: "slack" });
    assert.ok(out.startsWith("/api/media/slack?"), `expected proxy URL, got ${out}`);
  });

  test("recognises Slack host variants without a channel hint", () => {
    for (const url of [
      "https://files.slack.com/files-pri/T1/a.pdf",
      "https://europe.slack-edge.com/a.pdf",
      "https://x.slack-msgs.com/a.pdf",
    ]) {
      assert.ok(resolveMediaUrl(url).startsWith("/api/media/slack?"), `missed ${url}`);
    }
  });

  test("passes download flag and sanitized name through", () => {
    const out = resolveMediaUrl(SLACK_URL, { download: true, name: "report.pdf" });
    const params = new URL(out, "http://x").searchParams;
    assert.equal(params.get("download"), "1");
    assert.equal(params.get("name"), "report.pdf");
  });

  test("leaves non-Slack media untouched", () => {
    for (const url of [
      "https://cdn.example.com/a.png",
      "https://lookaside.fbsbx.com/x.jpg",
      "https://s3.r2.dev/tenants/1/photo.png",
    ]) {
      assert.equal(resolveMediaUrl(url, { channel: "instagram" }), url);
    }
  });

  test("does not double-rewrite an already proxied path", () => {
    const once = resolveMediaUrl(SLACK_URL);
    assert.equal(resolveMediaUrl(once), once);
  });

  test("leaves local and relative paths alone", () => {
    assert.equal(resolveMediaUrl("/uploads/a.png"), "/uploads/a.png");
    assert.equal(resolveMediaUrl("blob:abc"), "blob:abc");
  });

  test("handles missing input without throwing", () => {
    assert.equal(resolveMediaUrl(null), "");
    assert.equal(resolveMediaUrl(undefined), "");
    assert.equal(resolveMediaUrl(""), "");
  });
});