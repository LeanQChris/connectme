"use client";

import { useCallback, useEffect, useState } from "react";

type Connected = { whatsapp: boolean; messenger: boolean; instagram: boolean; telegram: boolean; discord: boolean };

interface SettingsPayload {
  settings: {
    connected: Connected;
    pageId: string | null;
    telegramBotId: string | null;
    discordBotId: string | null;
    updatedAt: string | null;
    webhookVerifyToken: string;
  };
  webhookUrls: { meta: string; telegram: string | null; discord: string | null };
}

interface Field {
  key: string;
  label: string;
  hint: string;
  /** Rendered as a password input and never sent back to the browser. */
  secret?: boolean;
}

const FIELDS: Field[] = [
  { key: "waPhoneNumberId", label: "Phone number ID", hint: "WhatsApp → API Setup" },
  { key: "waAccessToken", label: "Permanent access token", hint: "System user token", secret: true },
  { key: "waAppId", label: "Meta App ID", hint: "Needed for attachments", secret: false },
  { key: "metaAppSecret", label: "App secret", hint: "Verifies the webhook signature", secret: true },
  { key: "webhookVerifyToken", label: "Webhook verify token", hint: "Anything you choose", secret: false },
  { key: "pageAccessToken", label: "Page access token", hint: "Covers Messenger + Instagram", secret: true },
  { key: "telegramBotToken", label: "Bot token", hint: "From @BotFather", secret: true },
  { key: "discordBotToken", label: "Bot token", hint: "From Discord Developer Portal → Bot", secret: true },
] as const;

const GROUPS = [
  {
    id: "whatsapp",
    title: "WhatsApp Cloud API",
    blurb: "Number id, token, app id and app secret from the same Meta app.",
    channels: ["whatsapp"] as const,
    verify: "whatsapp" as const,
    keys: ["waPhoneNumberId", "waAccessToken", "waAppId", "metaAppSecret", "webhookVerifyToken"] as const,
  },
  {
    id: "page",
    title: "Messenger & Instagram",
    blurb: "One Facebook Page token serves both channels.",
    channels: ["messenger", "instagram"] as const,
    verify: "page" as const,
    keys: ["pageAccessToken", "metaAppSecret", "webhookVerifyToken"] as const,
  },
  {
    id: "telegram",
    title: "Telegram",
    blurb: "A bot from @BotFather. No reply-window limits.",
    channels: ["telegram"] as const,
    verify: "telegram" as const,
    keys: ["telegramBotToken"] as const,
  },
  {
    id: "discord",
    title: "Discord Bot",
    blurb: "A bot token from the Discord Developer Portal. No 24-hour reply window limit.",
    channels: ["discord"] as const,
    verify: "discord" as const,
    keys: ["discordBotToken"] as const,
  },
];

export default function SettingsForm({ origin }: { origin: string }) {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, { ok: boolean; detail: string }>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load your settings.");
      return;
    }
    setData((await res.json()) as SettingsPayload);
  }, []);

  // Initial read: the promise settles outside the effect body, so no cascading render.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (cancelled) return;
      if (!res.ok) {
        setError("Could not load your settings.");
        return;
      }
      setData((await res.json()) as SettingsPayload);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(keys: readonly string[]) {
    setBusy("save");
    setError(null);
    try {
      // Only send fields the user typed into, so saved secrets are never wiped.
      const patch: Record<string, string> = {};
      for (const key of keys) {
        if (values[key]?.trim()) patch[key] = values[key].trim();
      }
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save");

      setValues({});
      await load();
      setStatus((prev) => ({ ...prev, [keys.join(",")]: { ok: true, detail: "Saved" } }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  async function verify(channel: "whatsapp" | "page" | "telegram" | "discord") {
    setBusy(`verify-${channel}`);
    setError(null);
    try {
      const res = await fetch("/api/settings/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const body = await res.json().catch(() => ({}));
      setStatus((prev) => ({
        ...prev,
        [channel]: { ok: Boolean(body.ok), detail: String(body.detail ?? "No response") },
      }));
      if (body.pageId) await load();
    } catch {
      setStatus((prev) => ({ ...prev, [channel]: { ok: false, detail: "Verification failed" } }));
    } finally {
      setBusy(null);
    }
  }

  async function registerTelegram() {
    setBusy("telegram-webhook");
    setError(null);
    try {
      const res = await fetch(`/api/telegram/setup?url=${encodeURIComponent(origin)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not register the webhook");
      setStatus((prev) => ({
        ...prev,
        "telegram-webhook": { ok: true, detail: `Webhook set to ${body.webhookUrl}` },
      }));
      await load();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Could not register");
    } finally {
      setBusy(null);
    }
  }

  if (!data) {
    return <p className="text-[13px] text-mute">{error ?? "Loading settings…"}</p>;
  }

  const metaUrl = data.webhookUrls.meta;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Settings</h1>
        <p className="mt-1 text-[13px] text-body">
          Connect your own channels. Tokens are encrypted before they are stored and are never
          shown again.
        </p>
      </div>

      {error && (
        <div className="rounded-[8px] border border-error/30 bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </div>
      )}

      {GROUPS.map((group) => {
        const connected = group.channels.every((channel) => data.settings.connected[channel]);
        const fields = FIELDS.filter((field) => group.keys.includes(field.key as never));
        const verifyStatus = status[group.verify];

        return (
          <section
            key={group.id}
            className="rounded-[12px] border border-hairline bg-canvas-elevated p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[14px] font-semibold text-ink">{group.title}</h2>
                <p className="mt-0.5 text-[12px] text-body">{group.blurb}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                  connected
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-surface-well text-mute"
                }`}
              >
                {connected ? "Connected" : "Not connected"}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-body">{field.label}</span>
                  <input
                    type={field.secret ? "password" : "text"}
                    value={values[field.key] ?? ""}
                    placeholder={
                      field.secret && data.settings.connected[group.channels[0]]
                        ? "••••••••  (saved)"
                        : ""
                    }
                    autoComplete="off"
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className="h-9 w-full rounded-[6px] border border-hairline bg-canvas px-2.5 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                  />
                  <span className="text-[11px] text-mute">{field.hint}</span>
                </label>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void save(group.keys)}
                disabled={busy !== null}
                className="h-8 rounded-[6px] bg-primary px-3 text-[12.5px] font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy === "save" ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => void verify(group.verify)}
                disabled={busy !== null}
                className="h-8 rounded-[6px] border border-hairline bg-canvas-elevated px-3 text-[12.5px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink disabled:opacity-40"
              >
                {busy === `verify-${group.verify}` ? "Verifying…" : "Verify connection"}
              </button>

              {verifyStatus && (
                <span
                  className={`text-[12px] ${verifyStatus.ok ? "text-body" : "text-error"}`}
                >
                  {verifyStatus.detail}
                </span>
              )}
            </div>
          </section>
        );
      })}

      <section className="rounded-[12px] border border-hairline bg-canvas-elevated p-4">
        <h2 className="text-[14px] font-semibold text-ink">Webhooks</h2>
        <p className="mt-0.5 text-[12px] text-body">
          Point your provider at these URLs. Meta uses one callback for WhatsApp, Messenger and
          Instagram; Telegram uses one per bot.
        </p>

        <div className="mt-3 grid gap-3">
          <CopyRow label="Meta callback URL" value={metaUrl} />
          <CopyRow label="Verify token" value={data.settings.webhookVerifyToken || "Not set yet"} />
          <CopyRow
            label="Telegram callback URL"
            value={data.webhookUrls.telegram ?? "Add a bot token first"}
          />

          {data.settings.connected.telegram && (
            <div>
              <button
                type="button"
                onClick={() => void registerTelegram()}
                disabled={busy !== null}
                className="h-8 rounded-[6px] border border-hairline bg-canvas-elevated px-3 text-[12.5px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink disabled:opacity-40"
              >
                {busy === "telegram-webhook" ? "Registering…" : "Register Telegram webhook"}
              </button>
              {status["telegram-webhook"] && (
                <p className="mt-1 text-[12px] text-body">{status["telegram-webhook"].detail}</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-body">{label}</p>
        <p className="truncate font-mono text-[12px] text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="h-7 shrink-0 rounded-[6px] border border-hairline px-2.5 text-[11.5px] text-body transition-colors hover:bg-surface-well hover:text-ink"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
