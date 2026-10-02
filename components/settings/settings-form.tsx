"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { ConnectedAccount, SettingsPayload } from "@/lib/types";

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
  { key: "discordPublicKey", label: "Public key", hint: "From Discord Developer Portal → General Information → Public Key", secret: false },
] as const;

export default function SettingsForm({ initial }: { initial: SettingsPayload }) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SettingsPayload>(initial);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, { ok: boolean; detail: string }>>({});
  const [showManualMeta, setShowManualMeta] = useState(false);

  // Check URL params for OAuth callback status
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const connectedParam = searchParams.get("connected");
    const countParam = searchParams.get("count");

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    } else if (connectedParam === "meta") {
      setSuccess(
        countParam
          ? `Successfully connected ${countParam} accounts via Meta!`
          : "Successfully connected Facebook & Instagram!",
      );
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (!res.ok) {
      setError("Could not refresh your settings.");
      return;
    }
    setData((await res.json()) as SettingsPayload);
  }, []);

  async function saveManual(keys: readonly string[], groupId: string) {
    setBusy(`save-${groupId}`);
    setError(null);
    setSuccess(null);
    try {
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

  async function disconnectAccount(accountId?: string) {
    setBusy(accountId ? `disconnect-${accountId}` : "disconnect-all");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/auth/meta/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) throw new Error("Failed to disconnect account.");
      await load();
      setSuccess("Account removed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect.");
    } finally {
      setBusy(null);
    }
  }

  async function registerTelegram() {
    setBusy("telegram-webhook");
    setError(null);
    try {
      const res = await fetch(
        `/api/telegram/setup?url=${encodeURIComponent(window.location.origin)}`,
      );
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

  async function registerDiscord() {
    setBusy("discord-slash");
    setError(null);
    try {
      const res = await fetch("/api/discord/setup");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not register slash command");
      setStatus((prev) => ({
        ...prev,
        "discord-slash": {
          ok: true,
          detail: "Successfully registered /connectme slash command on Discord!",
        },
      }));
      await load();
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Could not register slash command");
    } finally {
      setBusy(null);
    }
  }

  const accounts = data.settings.accounts ?? [];
  const metaAccounts = accounts.filter((a) => a.provider === "meta" || a.channel === "messenger" || a.channel === "instagram");
  const isMetaConnected = data.settings.connected.messenger || data.settings.connected.instagram || metaAccounts.length > 0;
  const isWhatsAppConnected = data.settings.connected.whatsapp;
  const metaUrl = data.webhookUrls.meta;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Settings</h1>
        <p className="mt-1 text-[13px] text-body">
          Connect your social messaging channels and accounts. You can connect multiple Facebook Pages and Instagram accounts.
        </p>
      </div>

      {error && (
        <div className="rounded-[8px] border border-error/30 bg-error/10 px-3.5 py-2.5 text-[12.5px] text-error">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-[8px] border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[12.5px] text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      {/* ----------------- 1-Click Facebook & Instagram Multi-Account Section ----------------- */}
      <section className="rounded-[12px] border border-hairline bg-canvas-elevated p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1877F2]/10 text-[#1877F2]">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#E4405F]/10 text-[#E4405F]">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.13-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </span>
              <h2 className="text-[14.5px] font-semibold text-ink">Facebook Messenger & Instagram</h2>
            </div>
            <p className="mt-1 text-[12px] text-body">
              Connect multiple Facebook Pages and Instagram Creator / Business accounts in 1 click.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
              isMetaConnected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-surface-well text-mute"
            }`}
          >
            {isMetaConnected ? `${metaAccounts.length || 1} Connected` : "Not connected"}
          </span>
        </div>

        {/* List of Connected Accounts */}
        {metaAccounts.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <span className="text-[12px] font-medium text-body">Connected Pages & Handles:</span>
            {metaAccounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onDisconnect={() => void disconnectAccount(account.id)}
                isBusy={busy === `disconnect-${account.id}`}
              />
            ))}
          </div>
        )}

        {/* Legacy single connected display if no accounts array yet */}
        {metaAccounts.length === 0 && isMetaConnected && (
          <div className="mt-4 flex flex-col gap-3 rounded-[8px] border border-hairline bg-surface-well p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-ink">
                  {data.settings.pageName || "Facebook Page Connected"}
                </span>
                <span className="text-[11.5px] text-body">
                  Page ID: <code className="font-mono">{data.settings.pageId}</code>
                  {data.settings.instagramUsername && (
                    <> • Instagram: <span className="font-medium text-ink">@{data.settings.instagramUsername}</span></>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void disconnectAccount()}
                disabled={busy !== null}
                className="h-7 rounded-[6px] border border-error/30 bg-error/10 px-2.5 text-[11.5px] font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-40"
              >
                {busy === "disconnect-all" ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href="/api/auth/meta/connect"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] bg-[#1877F2] px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-95"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {isMetaConnected ? "Connect Additional Pages / Accounts" : "Connect with Facebook & Instagram"}
          </a>

          {!data.oauth.metaConfigured && (
            <span className="text-[11.5px] text-mute">
              (Requires <code className="font-mono">APP_ID</code> in server .env)
            </span>
          )}
        </div>

        {/* Optional Manual Developer Override */}
        <div className="mt-4 border-t border-hairline pt-3">
          <button
            type="button"
            onClick={() => setShowManualMeta((prev) => !prev)}
            className="text-[11.5px] font-medium text-body transition-colors hover:text-ink"
          >
            {showManualMeta ? "▲ Hide Custom Developer API Keys" : "▼ Advanced: Enter Custom Meta API Keys Manually"}
          </button>

          {showManualMeta && (
            <div className="mt-3 flex flex-col gap-3 rounded-[8px] border border-hairline bg-surface-well/50 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELDS.filter((f) => ["pageAccessToken", "metaAppSecret", "webhookVerifyToken"].includes(f.key)).map((field) => (
                  <label key={field.key} className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-body">{field.label}</span>
                    <input
                      type={field.secret ? "password" : "text"}
                      value={values[field.key] ?? ""}
                      placeholder={field.secret && isMetaConnected ? "••••••••  (saved)" : ""}
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void saveManual(["pageAccessToken", "metaAppSecret", "webhookVerifyToken"], "page")}
                  disabled={busy !== null}
                  className="h-7 rounded-[6px] bg-primary px-3 text-[12px] font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy === "save-page" ? "Saving…" : "Save Custom Keys"}
                </button>
                <button
                  type="button"
                  onClick={() => void verify("page")}
                  disabled={busy !== null}
                  className="h-7 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink disabled:opacity-40"
                >
                  {busy === "verify-page" ? "Verifying…" : "Verify"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ----------------- WhatsApp Cloud API Section ----------------- */}
      <section className="rounded-[12px] border border-hairline bg-canvas-elevated p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#25D366]/10 text-[#25D366]">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.07-2.036-.492-1.616-.677-2.646-2.316-2.727-2.424-.08-.108-.655-.873-.655-1.666 0-.793.415-1.183.562-1.344.148-.161.323-.201.43-.201.107 0 .215.002.308.007.1.005.234-.038.366.279.135.324.462 1.127.502 1.208.04.081.067.175.013.282-.054.108-.08.175-.161.269-.081.094-.17.21-.242.282-.081.081-.166.17-.071.332.095.161.42 1.002 1.216 1.71.503.447.927.585 1.061.652.135.067.215.054.296-.04.081-.094.349-.405.443-.544.094-.138.188-.117.315-.07.128.047.812.383.953.453.14.07.234.105.268.164.034.059.034.343-.11.748z" />
                </svg>
              </span>
              <h2 className="text-[14.5px] font-semibold text-ink">WhatsApp Cloud API</h2>
            </div>
            <p className="mt-1 text-[12px] text-body">
              Connect your WhatsApp Business numbers.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
              isWhatsAppConnected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-surface-well text-mute"
            }`}
          >
            {isWhatsAppConnected ? "Connected" : "Not connected"}
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {FIELDS.filter((f) => ["waPhoneNumberId", "waAccessToken", "waAppId", "metaAppSecret", "webhookVerifyToken"].includes(f.key)).map((field) => (
            <label key={field.key} className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-body">{field.label}</span>
              <input
                type={field.secret ? "password" : "text"}
                value={values[field.key] ?? ""}
                placeholder={field.secret && isWhatsAppConnected ? "••••••••  (saved)" : ""}
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
            onClick={() => void saveManual(["waPhoneNumberId", "waAccessToken", "waAppId", "metaAppSecret", "webhookVerifyToken"], "whatsapp")}
            disabled={busy !== null}
            className="h-8 rounded-[6px] bg-primary px-3 text-[12.5px] font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy === "save-whatsapp" ? "Saving…" : "Save WhatsApp"}
          </button>
          <button
            type="button"
            onClick={() => void verify("whatsapp")}
            disabled={busy !== null}
            className="h-8 rounded-[6px] border border-hairline bg-canvas-elevated px-3 text-[12.5px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink disabled:opacity-40"
          >
            {busy === "verify-whatsapp" ? "Verifying…" : "Verify connection"}
          </button>
          {status.whatsapp && (
            <span className={`text-[12px] ${status.whatsapp.ok ? "text-body" : "text-error"}`}>
              {status.whatsapp.detail}
            </span>
          )}
        </div>
      </section>

      {/* ----------------- Telegram Section ----------------- */}
      <section className="rounded-[12px] border border-hairline bg-canvas-elevated p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#229ED9]/10 text-[#229ED9]">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </span>
              <h2 className="text-[14.5px] font-semibold text-ink">Telegram Bot</h2>
            </div>
            <p className="mt-1 text-[12px] text-body">
              Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-primary hover:underline">@BotFather</a> on Telegram and paste the bot token.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
              data.settings.connected.telegram
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-surface-well text-mute"
            }`}
          >
            {data.settings.connected.telegram ? "Connected" : "Not connected"}
          </span>
        </div>

        <div className="mt-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-body">Bot Token</span>
            <input
              type="password"
              value={values.telegramBotToken ?? ""}
              placeholder={data.settings.connected.telegram ? "••••••••  (saved)" : "123456789:ABCdef..."}
              autoComplete="off"
              onChange={(event) =>
                setValues((prev) => ({ ...prev, telegramBotToken: event.target.value }))
              }
              className="h-9 w-full rounded-[6px] border border-hairline bg-canvas px-2.5 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void saveManual(["telegramBotToken"], "telegram")}
            disabled={busy !== null}
            className="h-8 rounded-[6px] bg-primary px-3 text-[12.5px] font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy === "save-telegram" ? "Saving…" : "Save Telegram"}
          </button>
          {data.settings.connected.telegram && (
            <button
              type="button"
              onClick={() => void registerTelegram()}
              disabled={busy !== null}
              className="h-8 rounded-[6px] border border-hairline bg-canvas-elevated px-3 text-[12.5px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink disabled:opacity-40"
            >
              {busy === "telegram-webhook" ? "Registering…" : "Auto-Register Webhook"}
            </button>
          )}
          {status["telegram-webhook"] && (
            <span className="text-[12px] text-body">{status["telegram-webhook"].detail}</span>
          )}
        </div>
      </section>

      {/* ----------------- Discord Section ----------------- */}
      <section className="rounded-[12px] border border-hairline bg-canvas-elevated p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#5865F2]/10 text-[#5865F2]">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </span>
              <h2 className="text-[14.5px] font-semibold text-ink">Discord Bot</h2>
            </div>
            <p className="mt-1 text-[12px] text-body">
              Add your bot token and public key from the <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-primary hover:underline">Discord Developer Portal</a>.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
              data.settings.connected.discord
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-surface-well text-mute"
            }`}
          >
            {data.settings.connected.discord ? "Connected" : "Not connected"}
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {FIELDS.filter((f) => ["discordBotToken", "discordPublicKey"].includes(f.key)).map((field) => (
            <label key={field.key} className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-body">{field.label}</span>
              <input
                type={field.secret ? "password" : "text"}
                value={values[field.key] ?? ""}
                placeholder={field.secret && data.settings.connected.discord ? "••••••••  (saved)" : ""}
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
            onClick={() => void saveManual(["discordBotToken", "discordPublicKey"], "discord")}
            disabled={busy !== null}
            className="h-8 rounded-[6px] bg-primary px-3 text-[12.5px] font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy === "save-discord" ? "Saving…" : "Save Discord"}
          </button>
          {data.settings.connected.discord && (
            <button
              type="button"
              onClick={() => void registerDiscord()}
              disabled={busy !== null}
              className="h-8 rounded-[6px] border border-hairline bg-canvas-elevated px-3 text-[12.5px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink disabled:opacity-40"
            >
              {busy === "discord-slash" ? "Registering…" : "Register /connectme Slash Command"}
            </button>
          )}
          {status["discord-slash"] && (
            <span className="text-[12px] text-body">{status["discord-slash"].detail}</span>
          )}
        </div>
      </section>

      {/* ----------------- Webhooks Info Section ----------------- */}
      <section className="rounded-[12px] border border-hairline bg-canvas-elevated p-5">
        <h2 className="text-[14.5px] font-semibold text-ink">Webhooks & Endpoints</h2>
        <p className="mt-1 text-[12px] text-body">
          Inbound endpoints for real-time messaging events.
        </p>

        <div className="mt-3 grid gap-3">
          <CopyRow label="Meta Webhook Callback URL" value={metaUrl} />
          <CopyRow label="Meta Webhook Verify Token" value={data.settings.webhookVerifyToken || "connectme_verify"} />
          {data.webhookUrls.telegram && (
            <CopyRow label="Telegram Webhook URL" value={data.webhookUrls.telegram} />
          )}
          {data.webhookUrls.discord && (
            <CopyRow
              label="Discord Interactions URL (for Slash commands)"
              value={data.webhookUrls.discord}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function AccountRow({
  account,
  onDisconnect,
  isBusy,
}: {
  account: ConnectedAccount;
  onDisconnect: () => void;
  isBusy: boolean;
}) {
  const isMessenger = account.channel === "messenger";
  const isInstagram = account.channel === "instagram";

  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-hairline bg-surface-well px-3.5 py-2.5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
            isMessenger
              ? "bg-[#1877F2]/10 text-[#1877F2]"
              : isInstagram
                ? "bg-[#E4405F]/10 text-[#E4405F]"
                : "bg-surface-well text-body"
          }`}
        >
          {isMessenger ? (
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.13-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          )}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="truncate text-[13px] font-medium text-ink">{account.name}</span>
          <span className="text-[11px] text-body">
            {isMessenger ? "Facebook Page" : isInstagram ? "Instagram Account" : account.channel} • ID: <code className="font-mono">{account.externalId}</code>
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onDisconnect}
        disabled={isBusy}
        className="h-7 shrink-0 rounded-[6px] border border-error/30 bg-error/10 px-2.5 text-[11.5px] font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-40"
      >
        {isBusy ? "Removing…" : "Disconnect"}
      </button>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 rounded-[6px] border border-hairline bg-surface-well px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11.5px] font-medium text-body">{label}</p>
        <p className="truncate font-mono text-[12px] text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="h-6 shrink-0 rounded-[4px] border border-hairline bg-canvas px-2 text-[11px] text-body transition-colors hover:bg-surface-well hover:text-ink"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
