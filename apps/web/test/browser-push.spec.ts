import { test } from "node:test";
import assert from "node:assert/strict";
import { enableBackgroundPush, disableBackgroundPush, hasBackgroundPush, reconcileBackgroundPush } from "../core/notifications/browser-push";

test("browser enrollment, disable, transient failure and sign-out races keep device state consistent", async () => {
  const names = ["window", "navigator", "localStorage", "Notification", "fetch"] as const;
  const originals = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const values = new Map<string, string>();
  let subscribed = false;
  let unsubscribes = 0;
  let fail = false;
  let release: (() => void) | undefined;
  let requested: (() => void) | undefined;
  let hold = false;
  const subscription = {
    endpoint: "https://fcm.googleapis.com/test",
    toJSON: () => ({ endpoint: "https://fcm.googleapis.com/test", expirationTime: null, keys: { p256dh: "p", auth: "a" } }),
    unsubscribe: async () => { subscribed = false; unsubscribes++; return true; },
  };
  const registration = { pushManager: {
    getSubscription: async () => subscribed ? subscription : null,
    subscribe: async () => { subscribed = true; return subscription; },
  } };
  const globals: Record<string, unknown> = {
    window: { PushManager: class {}, dispatchEvent: () => true },
    navigator: { serviceWorker: { register: async () => registration, ready: Promise.resolve(registration), getRegistration: async () => registration } },
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) },
    Notification: { permission: "granted" },
    fetch: async (url: string, options: RequestInit = {}) => {
      if (url.endsWith("config")) return Response.json({ configured: true, publicKey: "B".repeat(87) });
      if (options.method === "POST" && hold) { requested?.(); await new Promise<void>((resolve) => { release = resolve; }); }
      return fail ? Response.json({ message: "temporary outage" }, { status: 503 }) : Response.json({ ok: true });
    },
  };
  for (const name of names) Object.defineProperty(globalThis, name, { value: globals[name], configurable: true, writable: true });
  try {
    await reconcileBackgroundPush("member");
    await enableBackgroundPush("member");
    assert.equal(hasBackgroundPush(), true);
    fail = true;
    await assert.rejects(enableBackgroundPush("member"), /temporary outage/);
    assert.equal(hasBackgroundPush(), true, "an existing subscription survives a temporary save outage");
    assert.equal(subscribed, true);
    fail = false;
    await disableBackgroundPush();
    assert.equal(hasBackgroundPush(), false);
    assert.equal(subscribed, false);
    hold = true;
    const reached = new Promise<void>((resolve) => { requested = resolve; });
    const enrolling = enableBackgroundPush("member");
    await reached;
    await reconcileBackgroundPush(null);
    release!();
    await assert.rejects(enrolling, /cancelled/);
    assert.equal(hasBackgroundPush(), false);
    assert.equal(subscribed, false);
    assert.ok(unsubscribes >= 2);
  } finally {
    for (const name of names) { const original = originals.get(name); if (original) Object.defineProperty(globalThis, name, original); else Reflect.deleteProperty(globalThis, name); }
  }
});
