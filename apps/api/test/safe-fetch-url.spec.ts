import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isPublicIp, isSafePublicUrl } from "../src/infrastructure/security/safe-fetch-url";

/**
 * SSRF guard for `/api/preview-link`, which is public and takes the target URL
 * from the caller. Without this the server will fetch internal hosts on behalf
 * of an unauthenticated caller and return page content back.
 *
 * Every case here resolves locally (literals and integer shorthand never leave
 * getaddrinfo), so the suite needs no network.
 */
describe("isPublicIp", () => {
  test("rejects loopback, private, link-local and metadata ranges", () => {
    for (const ip of [
      "127.0.0.1",
      "127.1.2.3",
      "10.0.0.5",
      "10.255.255.255",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254", // cloud metadata
      "169.254.0.1",
      "0.0.0.0",
      "100.64.0.1", // CGNAT
      "198.18.0.1", // benchmarking
      "224.0.0.1", // multicast
      "255.255.255.255",
    ]) {
      assert.equal(isPublicIp(ip), false, `${ip} must be treated as non-public`);
    }
  });

  test("accepts globally routable addresses", () => {
    for (const ip of ["93.184.216.34", "1.1.1.1", "8.8.8.8", "172.15.0.1", "172.32.0.1"]) {
      assert.equal(isPublicIp(ip), true, `${ip} should be public`);
    }
  });

  test("rejects IPv6 that is not global unicast", () => {
    for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1"]) {
      assert.equal(isPublicIp(ip), false, `${ip} must be treated as non-public`);
    }
    // IPv4-mapped form of an internal address must not slip through.
    assert.equal(isPublicIp("::ffff:127.0.0.1"), false);
    assert.equal(isPublicIp("::ffff:169.254.169.254"), false);
    assert.equal(isPublicIp("::ffff:93.184.216.34"), true);
  });

  test("rejects anything it cannot parse", () => {
    for (const ip of ["", "not-an-ip", "999.1.1.1", "1.2.3", "abc"]) {
      assert.equal(isPublicIp(ip), false, `${ip} must fail closed`);
    }
  });
});

describe("isSafePublicUrl", () => {
  test("rejects non-http schemes", async () => {
    for (const url of [
      "ftp://example.com/x",
      "file:///etc/passwd",
      "gopher://example.com",
      "javascript:alert(1)",
      "data:text/html,x",
    ]) {
      assert.equal(await isSafePublicUrl(url), false, `${url} must be rejected`);
    }
  });

  test("rejects localhost and .localhost", async () => {
    assert.equal(await isSafePublicUrl("http://localhost:5434/"), false);
    assert.equal(await isSafePublicUrl("https://api.localhost/x"), false);
  });

  test("rejects internal literals, including cloud metadata", async () => {
    assert.equal(await isSafePublicUrl("http://169.254.169.254/latest/meta-data/"), false);
    assert.equal(await isSafePublicUrl("http://127.0.0.1:8081/api/health"), false);
    assert.equal(await isSafePublicUrl("http://10.1.2.3/"), false);
    assert.equal(await isSafePublicUrl("http://192.168.0.1/"), false);
    assert.equal(await isSafePublicUrl("http://[::1]/"), false);
  });

  test("rejects integer shorthand that resolves to loopback", async () => {
    // getaddrinfo normalises these to 127.0.0.1 — a pattern-matching guard
    // looking for "127." would let them straight through.
    assert.equal(await isSafePublicUrl("http://2130706433/"), false);
    assert.equal(await isSafePublicUrl("http://127.1/"), false);
  });

  test("rejects credentials embedded in the URL", async () => {
    assert.equal(await isSafePublicUrl("https://user:pass@example.com/"), false);
  });

  test("rejects unparseable or empty input", async () => {
    assert.equal(await isSafePublicUrl(""), false);
    assert.equal(await isSafePublicUrl("not a url"), false);
  });

  test("allows a globally routable target", async () => {
    // example.com's address, supplied literally so no external DNS is needed.
    assert.equal(await isSafePublicUrl("https://93.184.216.34/page"), true);
    assert.equal(await isSafePublicUrl("http://1.1.1.1/"), true);
    assert.equal(await isSafePublicUrl("https://[2606:4700:4700::1111]/"), true);
  });
});
