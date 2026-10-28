import { ApiError, httpClient } from "@/core/api/http-client";

const OWNER_KEY = "connectme_push_owner";
const VAPID_KEY = "connectme_push_public_key";
export const PUSH_CHANGED = "connectme:push-changed";
let activeUserId: string | null | undefined;
let enrollmentRevision = 0;

export function hasBackgroundPush(): boolean {
  return typeof window !== "undefined" && Boolean(localStorage.getItem(OWNER_KEY));
}
function changed() { window.dispatchEvent(new Event(PUSH_CHANGED)); }
async function registration() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Background push is unavailable in this browser. On iOS, install ConnectMe on the Home Screen first.");
  await navigator.serviceWorker.register("/sw.js");
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("The notification service did not start. Reload and try again.")), 12000); }),
  ]); } finally { clearTimeout(timeout); }
}

export async function enableBackgroundPush(userId: string): Promise<void> {
  const revision = enrollmentRevision;
  const config = await httpClient<{ configured: boolean; publicKey: string | null }>("/api/notifications/config", { signal: AbortSignal.timeout(15000) });
  if (!config.configured || !config.publicKey) throw new Error("Live alerts are enabled. Background alerts need VAPID keys configured on the server.");
  const reg = await registration();
  let subscription = await reg.pushManager.getSubscription();
  if (subscription && (localStorage.getItem(OWNER_KEY) !== userId || localStorage.getItem(VAPID_KEY) !== config.publicKey)) {
    await subscription.unsubscribe(); subscription = null;
  }
  const padded = config.publicKey.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(config.publicKey.length / 4) * 4, "=");
  if (!subscription) subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)) });
  const wasEnabled = localStorage.getItem(OWNER_KEY) === userId;
  try {
    if (revision !== enrollmentRevision || (activeUserId !== undefined && activeUserId !== userId)) throw new Error("Notification setup cancelled because the signed-in account changed.");
    await httpClient("/api/notifications/subscriptions", { method: "POST", body: JSON.stringify(subscription.toJSON()), signal: AbortSignal.timeout(15000) });
  } catch (err) {
    if (!wasEnabled || revision !== enrollmentRevision || (err instanceof ApiError && [401, 403].includes(err.status))) {
      await subscription.unsubscribe();
      if (localStorage.getItem(OWNER_KEY) === userId) localStorage.removeItem(OWNER_KEY);
      changed();
    }
    throw err;
  }
  if (revision !== enrollmentRevision || (activeUserId !== undefined && activeUserId !== userId)) {
    await subscription.unsubscribe();
    throw new Error("Notification setup cancelled because the signed-in account changed.");
  }
  localStorage.setItem(OWNER_KEY, userId);
  localStorage.setItem(VAPID_KEY, config.publicKey);
  changed();
}

export async function disableBackgroundPush(): Promise<void> {
  enrollmentRevision++;
  const reg = await navigator.serviceWorker.getRegistration();
  const subscription = await reg?.pushManager.getSubscription();
  localStorage.removeItem(OWNER_KEY);
  localStorage.removeItem(VAPID_KEY);
  changed();
  if (!subscription) return;
  try {
    await httpClient("/api/notifications/subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint: subscription.endpoint }), signal: AbortSignal.timeout(15000) });
  } finally { await subscription.unsubscribe(); }
}

export async function reconcileBackgroundPush(userId: string | null): Promise<void> {
  if (activeUserId !== userId) enrollmentRevision++;
  activeUserId = userId;
  if (!("serviceWorker" in navigator) || !hasBackgroundPush()) return;
  const owner = localStorage.getItem(OWNER_KEY);
  if (owner !== userId || Notification.permission !== "granted") {
    const reg = await navigator.serviceWorker.getRegistration();
    await (await reg?.pushManager.getSubscription())?.unsubscribe();
    localStorage.removeItem(OWNER_KEY); localStorage.removeItem(VAPID_KEY); changed();
    return;
  }
  if (userId) await enableBackgroundPush(userId);
}
export async function testBackgroundPush() {
  return httpClient("/api/notifications/test", { method: "POST", signal: AbortSignal.timeout(15000) });
}
