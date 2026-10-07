"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ChannelIcon } from "@/components/inbox/channel-badge";
import type { ConnectedAccount, SettingsPayload } from "@/lib/types";

type TabId = "whatsapp" | "meta" | "telegram" | "discord" | "slack" | "widget" | "webhooks";

export default function SettingsForm({ initial }: { initial: SettingsPayload }) {
  const searchParams = useSearchParams();

  // Read URL params once for initial notifications without triggering setState in an effect
  const initialError = searchParams.get("error") ? decodeURIComponent(searchParams.get("error")!) : null;
  const connectedParam = searchParams.get("connected");
  const countParam = searchParams.get("count");
  const initialSuccess =
    connectedParam === "meta"
      ? countParam
        ? `Successfully connected ${countParam} accounts via Meta!`
        : "Successfully connected Facebook & Instagram!"
      : null;

  const [data, setData] = useState<SettingsPayload>(initial);
  const [activeTab, setActiveTab] = useState<TabId>("whatsapp");
  const [globalError, setGlobalError] = useState<string | null>(initialError);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(initialSuccess);
  const [busy, setBusy] = useState<string | null>(null);

  async function saveWidgetOrigins() {
    setBusy("widget-origins");
    setGlobalError(null);
    setGlobalSuccess(null);
    try {
      const origins = widgetOrigins
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ widgetAllowedOrigins: origins }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to save allowed origins.");
      await load();
      setGlobalSuccess("Widget allowed origins saved!");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save allowed origins.");
    } finally {
      setBusy(null);
    }
  }

  // Status map for verification & action results per channel
  const [channelStatus, setChannelStatus] = useState<
    Record<string, { ok: boolean; detail: string }>
  >({});

  // Show/Hide password toggle map
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const toggleSecret = (fieldKey: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  // ISOLATED form states: each channel has its own independent state.
  // This guarantees editing one channel will NEVER modify or conflict with another.
  const [whatsappForm, setWhatsappForm] = useState({
    waPhoneNumberId: "",
    waAccessToken: "",
    waAppId: "",
    waAppSecret: "",
  });

  const [metaForm, setMetaForm] = useState({
    pageAccessToken: "",
    metaAppSecret: "",
    instagramAppSecret: "",
    webhookVerifyToken: "",
  });

  const [telegramForm, setTelegramForm] = useState({
    telegramBotToken: "",
  });

  const [discordForm, setDiscordForm] = useState({
    discordBotToken: "",
    discordPublicKey: "",
  });

  const [slackForm, setSlackForm] = useState({
    slackBotToken: "",
    slackSigningSecret: "",
  });

  const [showManualMeta, setShowManualMeta] = useState(false);

  // Workspace-wide automation settings (separate from per-channel secrets)
  const [widgetOrigins, setWidgetOrigins] = useState(
    (initial.settings.widgetAllowedOrigins ?? []).join(", "),
  );
  const [workspaceForm, setWorkspaceForm] = useState({
    webhookUrl: initial.settings.webhookUrl ?? "",
    agents: (initial.settings.agents ?? []).join(", "),
    templates: (initial.settings.templates ?? []).join("\n"),
  });

  // AI BYOK settings
  const [aiForm, setAiForm] = useState({
    aiProvider: initial.settings.aiProvider ?? "openai",
    aiModel: initial.settings.aiModel ?? "",
    aiApiKey: "",
  });

  const AI_MODEL_PLACEHOLDERS: Record<string, string> = {
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-haiku-latest",
    gemini: "gemini-1.5-flash",
  };

  async function saveAi() {
    setBusy("save-ai");
    setGlobalError(null);
    setGlobalSuccess(null);

    const payload: Record<string, string> = {
      aiProvider: aiForm.aiProvider,
      aiModel: aiForm.aiModel.trim(),
    };
    // Only send the key when the user typed one — blank means "keep existing"
    if (aiForm.aiApiKey.trim()) payload.aiApiKey = aiForm.aiApiKey.trim();

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to save AI settings.");

      await load();
      setAiForm((prev) => ({ ...prev, aiApiKey: "" }));
      setGlobalSuccess("AI settings saved successfully!");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save AI settings.");
    } finally {
      setBusy(null);
    }
  }

  async function saveWorkspace() {
    setBusy("save-workspace");
    setGlobalError(null);
    setGlobalSuccess(null);

    const agents = workspaceForm.agents
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const templates = workspaceForm.templates
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          webhookUrl: workspaceForm.webhookUrl.trim() || null,
          agents,
          templates,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to save settings.");

      await load();
      setGlobalSuccess("Workspace settings saved successfully!");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setBusy(null);
    }
  }

  // Reload fresh settings payload from the server
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not refresh settings.");
      const freshData = (await res.json()) as SettingsPayload;
      setData(freshData);
    } catch {
      setGlobalError("Could not refresh settings from server.");
    }
  }, []);

  // Generic patch saver: saves only the specified fields for a specific channel
  async function saveChannel(
    patch: Record<string, string>,
    channelKey: string,
    successMsg: string,
    onSuccessReset?: () => void,
  ) {
    // Only send fields that actually have non-empty values
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v.trim()) cleaned[k] = v.trim();
    }

    if (Object.keys(cleaned).length === 0) {
      setChannelStatus((prev) => ({
        ...prev,
        [channelKey]: { ok: false, detail: "Please enter at least one field to save." },
      }));
      return;
    }

    setBusy(`save-${channelKey}`);
    setGlobalError(null);
    setGlobalSuccess(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cleaned),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to save settings.");

      await load();
      onSuccessReset?.();
      setChannelStatus((prev) => ({
        ...prev,
        [channelKey]: { ok: true, detail: successMsg },
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save settings.";
      setChannelStatus((prev) => ({
        ...prev,
        [channelKey]: { ok: false, detail: msg },
      }));
    } finally {
      setBusy(null);
    }
  }

  // Verification helper for WhatsApp, Page (Facebook/Instagram), Telegram, Discord, Slack
  async function verifyChannel(channel: "whatsapp" | "page" | "telegram" | "discord" | "slack") {
    setBusy(`verify-${channel}`);
    setChannelStatus((prev) => ({ ...prev, [channel]: { ok: true, detail: "Verifying…" } }));

    try {
      const res = await fetch("/api/settings/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const body = await res.json().catch(() => ({}));
      setChannelStatus((prev) => ({
        ...prev,
        [channel]: {
          ok: Boolean(body.ok),
          detail: String(body.detail ?? (body.ok ? "Verification successful" : "Verification failed")),
        },
      }));
      if (body.ok) await load();
    } catch {
      setChannelStatus((prev) => ({
        ...prev,
        [channel]: { ok: false, detail: "Connection test failed. Please verify credentials." },
      }));
    } finally {
      setBusy(null);
    }
  }

  // Disconnect an account
  async function disconnectAccount(accountId?: string) {
    setBusy(accountId ? `disconnect-${accountId}` : "disconnect-all");
    setGlobalError(null);
    setGlobalSuccess(null);

    try {
      const res = await fetch("/api/auth/meta/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (!res.ok) throw new Error("Failed to disconnect account.");
      await load();
      setGlobalSuccess("Account disconnected successfully.");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Failed to disconnect account.");
    } finally {
      setBusy(null);
    }
  }

  // Register Telegram Webhook
  async function registerTelegram() {
    setBusy("telegram-webhook");
    setChannelStatus((prev) => ({
      ...prev,
      "telegram-webhook": { ok: true, detail: "Registering webhook with Telegram…" },
    }));

    try {
      const res = await fetch(
        `/api/telegram/setup?url=${encodeURIComponent(window.location.origin)}`,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to register Telegram webhook.");

      setChannelStatus((prev) => ({
        ...prev,
        "telegram-webhook": { ok: true, detail: `✓ Webhook active: ${body.webhookUrl}` },
      }));
      await load();
    } catch (err) {
      setChannelStatus((prev) => ({
        ...prev,
        "telegram-webhook": {
          ok: false,
          detail: err instanceof Error ? err.message : "Failed to register webhook.",
        },
      }));
    } finally {
      setBusy(null);
    }
  }

  // Register Discord Slash Command
  async function registerDiscord() {
    setBusy("discord-slash");
    setChannelStatus((prev) => ({
      ...prev,
      "discord-slash": { ok: true, detail: "Registering slash command with Discord…" },
    }));

    try {
      const res = await fetch("/api/discord/setup");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to register slash command.");

      setChannelStatus((prev) => ({
        ...prev,
        "discord-slash": { ok: true, detail: "✓ /connectme command registered successfully!" },
      }));
    } catch (err) {
      setChannelStatus((prev) => ({
        ...prev,
        "discord-slash": {
          ok: false,
          detail: err instanceof Error ? err.message : "Failed to register slash command.",
        },
      }));
    } finally {
      setBusy(null);
    }
  }

  // Register / rotate this tenant's website widget embed id
  async function setupWidget(rotate: boolean) {
    setBusy("widget-setup");
    setChannelStatus((prev) => ({
      ...prev,
      widget: { ok: true, detail: rotate ? "Rotating embed id…" : "Creating embed code…" },
    }));

    try {
      const res = await fetch("/api/widget/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rotate }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to set up the widget.");

      await load();
      setChannelStatus((prev) => ({
        ...prev,
        widget: {
          ok: true,
          detail: rotate
            ? "New embed id issued — re-paste the script on your site."
            : "Embed code ready below.",
        },
      }));
    } catch (err) {
      setChannelStatus((prev) => ({
        ...prev,
        widget: {
          ok: false,
          detail: err instanceof Error ? err.message : "Failed to set up the widget.",
        },
      }));
    } finally {
      setBusy(null);
    }
  }

  const isWhatsAppConnected = data.settings.connected.whatsapp;
  const isMetaConnected =
    data.settings.connected.messenger ||
    data.settings.connected.instagram ||
    (data.settings.accounts && data.settings.accounts.length > 0);
  const isTelegramConnected = data.settings.connected.telegram;
  const isDiscordConnected = data.settings.connected.discord;
  const isSlackConnected = data.settings.connected.slack;
  const isWidgetEnabled = Boolean(data.settings.widgetId);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const metaUrl = data.webhookUrls.meta.startsWith("http")
    ? data.webhookUrls.meta
    : `${origin}${data.webhookUrls.meta}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Page Title & Subtitle */}
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">
          Workspace Settings
        </h1>
        <p className="mt-1 text-[13.5px] text-body">
          Configure customer channels, OAuth permissions, and webhook endpoints for your inbox.
        </p>
      </div>

      {/* Global Alerts */}
      {globalSuccess && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-[13px] text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{globalSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalSuccess(null)}
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {globalError && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-[13px] text-error">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{globalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-error text-xs cursor-pointer hover:opacity-80"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Channel Navigation Tabs */}
      <div className="mb-6 flex overflow-x-auto border-b border-hairline no-scrollbar gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("whatsapp")}
          className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "whatsapp"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-mute hover:text-body"
          }`}
        >
          <ChannelIcon channel="whatsapp" className="h-4 w-4 text-whatsapp" />
          <span>WhatsApp</span>
          <span
            className={`h-2 w-2 rounded-full ${
              isWhatsAppConnected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("meta")}
          className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "meta"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-mute hover:text-body"
          }`}
        >
          <ChannelIcon channel="messenger" className="h-4 w-4 text-messenger" />
          <span>Facebook & Instagram</span>
          <span
            className={`h-2 w-2 rounded-full ${
              isMetaConnected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("telegram")}
          className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "telegram"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-mute hover:text-body"
          }`}
        >
          <ChannelIcon channel="telegram" className="h-4 w-4 text-sky-500" />
          <span>Telegram</span>
          <span
            className={`h-2 w-2 rounded-full ${
              isTelegramConnected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("discord")}
          className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "discord"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-mute hover:text-body"
          }`}
        >
          <ChannelIcon channel="discord" className="h-4 w-4 text-[#5865F2]" />
          <span>Discord</span>
          <span
            className={`h-2 w-2 rounded-full ${
              isDiscordConnected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("slack")}
          className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "slack"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-mute hover:text-body"
          }`}
        >
          <ChannelIcon channel="slack" className="h-4 w-4 text-[#E01E5A]" />
          <span>Slack</span>
          <span
            className={`h-2 w-2 rounded-full ${
              isSlackConnected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("widget")}
          className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "widget"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-mute hover:text-body"
          }`}
        >
          <ChannelIcon channel="widget" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Website</span>
          <span
            className={`h-2 w-2 rounded-full ${
              isWidgetEnabled ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("webhooks")}
          className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "webhooks"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-mute hover:text-body"
          }`}
        >
          <svg className="h-4 w-4 text-mute stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>Webhooks & URLs</span>
        </button>
      </div>

      {/* =======================================================================
          TAB 1: WHATSAPP CLOUD API
         ======================================================================= */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-whatsapp/10 text-whatsapp">
                  <ChannelIcon channel="whatsapp" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">WhatsApp Cloud API</h2>
                  <p className="text-[12.5px] text-body">
                    Official Meta Cloud API for customer conversations and media attachments.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium ${
                    isWhatsAppConnected
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-surface-well text-mute border border-hairline"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isWhatsAppConnected ? "bg-emerald-500" : "bg-neutral-400"
                    }`}
                  />
                  {isWhatsAppConnected ? "Connected" : "Not configured"}
                </span>
              </div>
            </div>

            {/* Currently Active Configuration Badge */}
            {data.settings.waPhoneNumberId && (
              <div className="mt-4 rounded-lg border border-hairline bg-surface-well/50 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                <span className="text-body">
                  Active Phone Number ID: <strong className="font-mono text-ink">{data.settings.waPhoneNumberId}</strong>
                </span>
                {data.settings.waAppId && (
                  <span className="text-mute font-mono text-[11px]">
                    Meta App ID: {data.settings.waAppId}
                  </span>
                )}
              </div>
            )}

            {/* WhatsApp Form Inputs (Strictly Isolated State) */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {/* Phone Number ID */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-ink">
                  Phone Number ID <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={whatsappForm.waPhoneNumberId}
                  onChange={(e) =>
                    setWhatsappForm((prev) => ({ ...prev, waPhoneNumberId: e.target.value }))
                  }
                  placeholder={data.settings.waPhoneNumberId || "e.g. 104829104829104"}
                  className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                />
                <span className="text-[11px] text-mute">
                  From Meta Developer Portal → WhatsApp → API Setup
                </span>
              </div>

              {/* Access Token */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-ink">
                  Permanent Access Token <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={visibleSecrets.waAccessToken ? "text" : "password"}
                    value={whatsappForm.waAccessToken}
                    onChange={(e) =>
                      setWhatsappForm((prev) => ({ ...prev, waAccessToken: e.target.value }))
                    }
                    placeholder={isWhatsAppConnected ? "••••••••••••  (Active & Encrypted)" : "EAAG..."}
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 pr-10 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("waAccessToken")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
                    title={visibleSecrets.waAccessToken ? "Hide" : "Show"}
                  >
                    {visibleSecrets.waAccessToken ? "Hide" : "Show"}
                  </button>
                </div>
                <span className="text-[11px] text-mute">
                  System User Token with <code className="font-mono">whatsapp_business_messaging</code>
                </span>
              </div>

              {/* Meta App ID (Optional) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-ink">
                  Meta App ID <span className="text-mute font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={whatsappForm.waAppId}
                  onChange={(e) =>
                    setWhatsappForm((prev) => ({ ...prev, waAppId: e.target.value }))
                  }
                  placeholder={data.settings.waAppId || "e.g. 592019482910"}
                  className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                />
                <span className="text-[11px] text-mute">
                  Used to address WhatsApp media uploads directly
                </span>
              </div>

              {/* WhatsApp App Secret (Dedicated to WhatsApp - never touches Meta/Messenger) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-ink">
                  WhatsApp App Secret <span className="text-mute font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <input
                    type={visibleSecrets.waAppSecret ? "text" : "password"}
                    value={whatsappForm.waAppSecret}
                    onChange={(e) =>
                      setWhatsappForm((prev) => ({ ...prev, waAppSecret: e.target.value }))
                    }
                    placeholder="App secret for WhatsApp webhook HMAC"
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 pr-10 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("waAppSecret")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
                  >
                    {visibleSecrets.waAppSecret ? "Hide" : "Show"}
                  </button>
                </div>
                <span className="text-[11px] text-mute">
                  Isolated secret for your WhatsApp developer app
                </span>
              </div>
            </div>

            {/* Action Buttons & Feedback */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void saveChannel(
                      {
                        waPhoneNumberId: whatsappForm.waPhoneNumberId,
                        waAccessToken: whatsappForm.waAccessToken,
                        waAppId: whatsappForm.waAppId,
                        waAppSecret: whatsappForm.waAppSecret,
                      },
                      "whatsapp",
                      "WhatsApp settings saved successfully!",
                      () =>
                        setWhatsappForm({
                          waPhoneNumberId: "",
                          waAccessToken: "",
                          waAppId: "",
                          waAppSecret: "",
                        }),
                    )
                  }
                  disabled={busy !== null}
                  className="flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {busy === "save-whatsapp" ? "Saving WhatsApp…" : "Save WhatsApp Settings"}
                </button>

                <button
                  type="button"
                  onClick={() => void verifyChannel("whatsapp")}
                  disabled={busy !== null}
                  className="flex h-9 items-center justify-center rounded-lg border border-hairline bg-canvas-elevated px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer"
                >
                  {busy === "verify-whatsapp" ? "Testing…" : "Verify Connection"}
                </button>
              </div>

              {channelStatus.whatsapp && (
                <div
                  className={`text-[12.5px] font-medium ${
                    channelStatus.whatsapp.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
                  }`}
                >
                  {channelStatus.whatsapp.detail}
                </div>
              )}
            </div>
          </div>

          {/* Quick Setup Guide Card */}
          <div className="rounded-xl border border-hairline bg-surface-well/40 p-4 text-[12.5px] text-body">
            <h3 className="font-semibold text-ink text-[13px] mb-1">Quick WhatsApp Setup Guide:</h3>
            <ol className="list-decimal pl-5 space-y-1 text-mute text-[12px]">
              <li>
                Visit <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-ink underline">Meta Developer Portal</a> and select your Business App.
              </li>
              <li>Under WhatsApp → API Setup, copy your <strong>Phone number ID</strong>.</li>
              <li>Generate a Permanent System User Token with <code className="font-mono text-ink">whatsapp_business_messaging</code> and <code className="font-mono text-ink">whatsapp_business_management</code>.</li>
              <li>Paste the values above and click Save. Copy the Webhook URL from the <em>Webhooks</em> tab into Meta.</li>
            </ol>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 2: FACEBOOK & INSTAGRAM
         ======================================================================= */}
      {activeTab === "meta" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-messenger/10 text-messenger">
                  <ChannelIcon channel="messenger" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">Facebook Messenger & Instagram</h2>
                  <p className="text-[12.5px] text-body">
                    Connect your Facebook Pages and Instagram Professional handles into the unified queue.
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium self-start sm:self-auto ${
                  isMetaConnected
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-surface-well text-mute border border-hairline"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isMetaConnected ? "bg-emerald-500" : "bg-neutral-400"}`} />
                {isMetaConnected ? "Connected" : "No accounts connected"}
              </span>
            </div>

            {/* 1-Click OAuth Connect Button */}
            <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">1-Click Fast Connect (Recommended)</h3>
                  <p className="text-[12px] text-body mt-0.5">
                    Connect automatically through Meta OAuth. Fetches all your Facebook Pages and connected Instagram Business accounts instantly.
                  </p>
                </div>

                <a
                  href="/api/auth/meta/connect"
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-95 shadow-xs cursor-pointer"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  {isMetaConnected ? "Add / Reconnect Pages" : "Connect with Facebook"}
                </a>
              </div>
            </div>

            {/* Connected Accounts List */}
            {data.settings.accounts && data.settings.accounts.length > 0 && (
              <div className="mt-5">
                <h3 className="text-[13px] font-semibold text-ink mb-2">Connected Accounts ({data.settings.accounts.length}):</h3>
                <div className="divide-y divide-hairline rounded-lg border border-hairline bg-canvas">
                  {data.settings.accounts.map((acc) => (
                    <AccountRow
                      key={acc.id}
                      account={acc}
                      onDisconnect={() => void disconnectAccount(acc.id)}
                      isBusy={busy === `disconnect-${acc.id}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Manual Developer Overrides (Collapsed) */}
            <div className="mt-6 border-t border-hairline pt-4">
              <button
                type="button"
                onClick={() => setShowManualMeta((prev) => !prev)}
                className="text-[12.5px] font-medium text-body hover:text-ink transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>{showManualMeta ? "▼" : "▶"}</span>
                <span>Advanced: Enter Custom Meta Developer Keys Manually</span>
              </button>

              {showManualMeta && (
                <div className="mt-4 rounded-xl border border-hairline bg-surface-well/50 p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Page Access Token */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-ink">Page Access Token</label>
                      <div className="relative">
                        <input
                          type={visibleSecrets.pageAccessToken ? "text" : "password"}
                          value={metaForm.pageAccessToken}
                          onChange={(e) =>
                            setMetaForm((prev) => ({ ...prev, pageAccessToken: e.target.value }))
                          }
                          placeholder={isMetaConnected ? "•••••••••••• (saved)" : "EAA..."}
                          className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 pr-10 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecret("pageAccessToken")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
                        >
                          {visibleSecrets.pageAccessToken ? "Hide" : "Show"}
                        </button>
                      </div>
                      <span className="text-[11px] text-mute">Permanent Page Token for Messenger / Instagram</span>
                    </div>

                    {/* Meta App Secret (Dedicated to Meta / Pages) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-ink">Facebook App Secret</label>
                      <div className="relative">
                        <input
                          type={visibleSecrets.metaAppSecret ? "text" : "password"}
                          value={metaForm.metaAppSecret}
                          onChange={(e) =>
                            setMetaForm((prev) => ({ ...prev, metaAppSecret: e.target.value }))
                          }
                          placeholder="App Secret from Meta Basic Settings"
                          className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 pr-10 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecret("metaAppSecret")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
                        >
                          {visibleSecrets.metaAppSecret ? "Hide" : "Show"}
                        </button>
                      </div>
                      <span className="text-[11px] text-mute">Verifies signatures for Facebook Page webhooks</span>
                    </div>

                    {/* Instagram App Secret (Dedicated to Instagram API Use Case) */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-medium text-ink">Instagram App Secret (Optional)</label>
                      <div className="relative">
                        <input
                          type={visibleSecrets.instagramAppSecret ? "text" : "password"}
                          value={metaForm.instagramAppSecret}
                          onChange={(e) =>
                            setMetaForm((prev) => ({ ...prev, instagramAppSecret: e.target.value }))
                          }
                          placeholder="Instagram App Secret from Instagram API card"
                          className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 pr-10 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => toggleSecret("instagramAppSecret")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
                        >
                          {visibleSecrets.instagramAppSecret ? "Hide" : "Show"}
                        </button>
                      </div>
                      <span className="text-[11px] text-mute">From Meta Developer Dashboard &gt; Instagram API</span>
                    </div>

                    {/* Webhook Verify Token */}
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-[12px] font-medium text-ink">Webhook Verify Token</label>
                      <input
                        type="text"
                        value={metaForm.webhookVerifyToken}
                        onChange={(e) =>
                          setMetaForm((prev) => ({ ...prev, webhookVerifyToken: e.target.value }))
                        }
                        placeholder={data.settings.webhookVerifyToken || "connectme_verify"}
                        className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                      />
                      <span className="text-[11px] text-mute">Must match the token entered in your Meta Webhooks dashboard</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        void saveChannel(
                          {
                            pageAccessToken: metaForm.pageAccessToken,
                            metaAppSecret: metaForm.metaAppSecret,
                            instagramAppSecret: metaForm.instagramAppSecret,
                            webhookVerifyToken: metaForm.webhookVerifyToken,
                          },
                          "meta",
                          "Meta developer keys saved successfully!",
                          () =>
                            setMetaForm({
                              pageAccessToken: "",
                              metaAppSecret: "",
                              instagramAppSecret: "",
                              webhookVerifyToken: "",
                            }),
                        )
                      }
                      disabled={busy !== null}
                      className="h-8 rounded-lg bg-primary px-3 text-[12px] font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      {busy === "save-meta" ? "Saving…" : "Save Custom Keys"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void verifyChannel("page")}
                      disabled={busy !== null}
                      className="h-8 rounded-lg border border-hairline bg-canvas px-3 text-[12px] font-medium text-ink transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer"
                    >
                      {busy === "verify-page" ? "Verifying…" : "Verify Custom Token"}
                    </button>
                    {channelStatus.meta && (
                      <span
                        className={`text-[12px] font-medium ${
                          channelStatus.meta.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
                        }`}
                      >
                        {channelStatus.meta.detail}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 3: TELEGRAM
         ======================================================================= */}
      {activeTab === "telegram" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                  <ChannelIcon channel="telegram" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">Telegram Bot</h2>
                  <p className="text-[12.5px] text-body">
                    Receive and send 1-to-1 customer messages directly via your Telegram bot.
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium self-start sm:self-auto ${
                  isTelegramConnected
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-surface-well text-mute border border-hairline"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isTelegramConnected ? "bg-emerald-500" : "bg-neutral-400"}`} />
                {isTelegramConnected ? "Connected" : "Not connected"}
              </span>
            </div>

            {data.settings.telegramBotId && (
              <div className="mt-4 rounded-lg border border-hairline bg-surface-well/50 px-3.5 py-2.5 text-[12px] text-body">
                Active Bot Router ID: <strong className="font-mono text-ink">{data.settings.telegramBotId}</strong>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-ink">
                  Telegram Bot Token <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={visibleSecrets.telegramBotToken ? "text" : "password"}
                    value={telegramForm.telegramBotToken}
                    onChange={(e) =>
                      setTelegramForm({ telegramBotToken: e.target.value })
                    }
                    placeholder={isTelegramConnected ? "••••••••••••  (Active & Encrypted)" : "123456789:ABCdefGHIjklMNOpqr..."}
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 pr-10 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("telegramBotToken")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
                  >
                    {visibleSecrets.telegramBotToken ? "Hide" : "Show"}
                  </button>
                </div>
                <span className="text-[11px] text-mute">
                  Obtained from <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-ink underline">@BotFather</a> on Telegram
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-hairline">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void saveChannel(
                        { telegramBotToken: telegramForm.telegramBotToken },
                        "telegram",
                        "Telegram bot token saved successfully!",
                        () => setTelegramForm({ telegramBotToken: "" }),
                      )
                    }
                    disabled={busy !== null}
                    className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {busy === "save-telegram" ? "Saving…" : "Save Telegram Token"}
                  </button>

                  {isTelegramConnected && (
                    <button
                      type="button"
                      onClick={() => void registerTelegram()}
                      disabled={busy !== null}
                      className="h-9 rounded-lg border border-hairline bg-canvas-elevated px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer"
                    >
                      {busy === "telegram-webhook" ? "Registering…" : "Auto-Register Webhook"}
                    </button>
                  )}
                </div>

                {channelStatus.telegram && (
                  <span
                    className={`text-[12.5px] font-medium ${
                      channelStatus.telegram.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
                    }`}
                  >
                    {channelStatus.telegram.detail}
                  </span>
                )}
                {channelStatus["telegram-webhook"] && (
                  <span
                    className={`text-[12.5px] font-medium ${
                      channelStatus["telegram-webhook"].ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
                    }`}
                  >
                    {channelStatus["telegram-webhook"].detail}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 4: DISCORD
         ======================================================================= */}
      {activeTab === "discord" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/10 text-[#5865F2]">
                  <ChannelIcon channel="discord" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">Discord Bot</h2>
                  <p className="text-[12.5px] text-body">
                    Connect server messages, direct inquiries, and slash commands via Discord.
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium self-start sm:self-auto ${
                  isDiscordConnected
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-surface-well text-mute border border-hairline"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isDiscordConnected ? "bg-emerald-500" : "bg-neutral-400"}`} />
                {isDiscordConnected ? "Connected" : "Not connected"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-ink">
                  Discord Bot Token <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={visibleSecrets.discordBotToken ? "text" : "password"}
                    value={discordForm.discordBotToken}
                    onChange={(e) =>
                      setDiscordForm((prev) => ({ ...prev, discordBotToken: e.target.value }))
                    }
                    placeholder={isDiscordConnected ? "••••••••••••  (Active & Encrypted)" : "MTA..."}
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 pr-10 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("discordBotToken")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
                  >
                    {visibleSecrets.discordBotToken ? "Hide" : "Show"}
                  </button>
                </div>
                <span className="text-[11px] text-mute">From Discord Developer Portal → Bot → Token</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-ink">
                  Discord Public Key <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={discordForm.discordPublicKey}
                  onChange={(e) =>
                    setDiscordForm((prev) => ({ ...prev, discordPublicKey: e.target.value }))
                  }
                  placeholder="General Information → Public Key"
                  className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                />
                <span className="text-[11px] text-mute">Used to verify Discord interaction signatures</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void saveChannel(
                      {
                        discordBotToken: discordForm.discordBotToken,
                        discordPublicKey: discordForm.discordPublicKey,
                      },
                      "discord",
                      "Discord settings saved successfully!",
                      () => setDiscordForm({ discordBotToken: "", discordPublicKey: "" }),
                    )
                  }
                  disabled={busy !== null}
                  className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {busy === "save-discord" ? "Saving…" : "Save Discord Settings"}
                </button>

                {isDiscordConnected && (
                  <button
                    type="button"
                    onClick={() => void registerDiscord()}
                    disabled={busy !== null}
                    className="h-9 rounded-lg border border-hairline bg-canvas-elevated px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer"
                  >
                    {busy === "discord-slash" ? "Registering…" : "Register /connectme Command"}
                  </button>
                )}
              </div>

              {channelStatus.discord && (
                <span
                  className={`text-[12.5px] font-medium ${
                    channelStatus.discord.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
                  }`}
                >
                  {channelStatus.discord.detail}
                </span>
              )}
              {channelStatus["discord-slash"] && (
                <span
                  className={`text-[12.5px] font-medium ${
                    channelStatus["discord-slash"].ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
                  }`}
                >
                  {channelStatus["discord-slash"].detail}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 5: SLACK
         ======================================================================= */}
      {activeTab === "slack" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4A154B]/10 text-[#4A154B] dark:bg-[#E01E5A]/10 dark:text-[#E01E5A]">
                  <ChannelIcon channel="slack" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">Slack App &amp; Bot</h2>
                  <p className="text-[12.5px] text-body">
                    Route customer inquiries, channel messages, and direct DMs through Slack.
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium self-start sm:self-auto ${
                  isSlackConnected
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-surface-well text-mute border border-hairline"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isSlackConnected ? "bg-emerald-500" : "bg-neutral-400"}`} />
                {isSlackConnected ? "Connected" : "Not connected"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-ink">
                  Bot User OAuth Token <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={visibleSecrets.slackBotToken ? "text" : "password"}
                    value={slackForm.slackBotToken}
                    onChange={(e) =>
                      setSlackForm((prev) => ({ ...prev, slackBotToken: e.target.value }))
                    }
                    placeholder={isSlackConnected ? "••••••••••••  (Active & Encrypted)" : "xoxb-..."}
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 pr-10 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("slackBotToken")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1 cursor-pointer"
                  >
                    {visibleSecrets.slackBotToken ? "Hide" : "Show"}
                  </button>
                </div>
                <span className="text-[11px] text-mute">From Slack API → OAuth &amp; Permissions → Bot User OAuth Token</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-ink">
                  Signing Secret <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={visibleSecrets.slackSigningSecret ? "text" : "password"}
                    value={slackForm.slackSigningSecret}
                    onChange={(e) =>
                      setSlackForm((prev) => ({ ...prev, slackSigningSecret: e.target.value }))
                    }
                    placeholder={isSlackConnected ? "••••••••••••  (Active & Encrypted)" : "Basic Information → Signing Secret"}
                    className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 pr-10 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("slackSigningSecret")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1 cursor-pointer"
                  >
                    {visibleSecrets.slackSigningSecret ? "Hide" : "Show"}
                  </button>
                </div>
                <span className="text-[11px] text-mute">Used to verify X-Slack-Signature on incoming webhooks</span>
              </div>
            </div>

            {/* Quick Setup Instructions */}
            <div className="mt-5 rounded-lg border border-hairline bg-surface-well/50 p-3.5 text-[12.5px] text-body space-y-2">
              <span className="font-semibold text-ink flex items-center gap-1.5">
                <span>⚡</span> Slack App Setup Checklist
              </span>
              <ul className="list-disc space-y-1 pl-4 text-[12px] text-mute">
                <li>Create an App at <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-ink underline">api.slack.com/apps</a>.</li>
                <li>Under <strong>OAuth &amp; Permissions</strong>, add Bot Scopes: <code className="text-ink font-mono text-[11px]">chat:write</code>, <code className="text-ink font-mono text-[11px]">channels:history</code>, <code className="text-ink font-mono text-[11px]">im:history</code>, <code className="text-ink font-mono text-[11px]">groups:history</code>, <code className="text-ink font-mono text-[11px]">users:read</code>, <code className="text-ink font-mono text-[11px]">files:read</code>.</li>
                <li>Under <strong>Event Subscriptions</strong>, toggle On, paste your Webhook URL (<code className="text-ink font-mono text-[11px]">{data.webhookUrls.slack || `${origin}/api/webhook/slack`}</code>), and subscribe to bot events: <code className="text-ink font-mono text-[11px]">message.channels</code>, <code className="text-ink font-mono text-[11px]">message.im</code>, <code className="text-ink font-mono text-[11px]">message.groups</code>.</li>
                <li>Install the App to your workspace and paste the tokens above.</li>
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void saveChannel(
                      {
                        slackBotToken: slackForm.slackBotToken,
                        slackSigningSecret: slackForm.slackSigningSecret,
                      },
                      "slack",
                      "Slack settings saved successfully!",
                      () => setSlackForm({ slackBotToken: "", slackSigningSecret: "" }),
                    )
                  }
                  disabled={busy !== null}
                  className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {busy === "save-slack" ? "Saving…" : "Save Slack Settings"}
                </button>

                {isSlackConnected && (
                  <button
                    type="button"
                    onClick={() => void verifyChannel("slack")}
                    disabled={busy !== null}
                    className="h-9 rounded-lg border border-hairline bg-canvas-elevated px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer"
                  >
                    {busy === "verify-slack" ? "Testing…" : "Test Connection"}
                  </button>
                )}
              </div>

              {channelStatus.slack && (
                <span
                  className={`text-[12.5px] font-medium ${
                    channelStatus.slack.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
                  }`}
                >
                  {channelStatus.slack.detail}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 6: WEBSITE WIDGET
         ======================================================================= */}
      {activeTab === "widget" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ChannelIcon channel="widget" className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">Website Chat Widget</h2>
                  <p className="text-[12.5px] text-body">
                    A chat box on your own website. No app to install, no API keys — visitor
                    messages land right here in the inbox.
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium self-start sm:self-auto ${
                  isWidgetEnabled
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-surface-well text-mute border border-hairline"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isWidgetEnabled ? "bg-emerald-500" : "bg-neutral-400"}`}
                />
                {isWidgetEnabled ? "Enabled" : "Not enabled"}
              </span>
            </div>

            {data.settings.widgetScriptUrl ? (
              <>
                <div className="mt-5 space-y-3.5">
                  <CopyCard
                    label="Embed code — paste before </body> on your site"
                    value={`<script src="${data.settings.widgetScriptUrl}" async></script>`}
                    hint="Works on any site or page builder — Webflow, Shopify, WordPress, plain HTML."
                  />

                  <CopyCard
                    label="Live preview"
                    value={`${origin}/widget.js?wid=${data.settings.widgetId ?? ""}`}
                    hint="Open this URL directly to see the widget on a blank page."
                  />
                </div>

                <div className="mt-5 rounded-lg border border-hairline bg-surface-well/50 p-3.5 text-[12.5px] text-body space-y-2">
                  <span className="font-semibold text-ink">How it behaves</span>
                  <ul className="list-disc space-y-1 pl-4 text-[12px] text-mute">
                    <li>Replies arrive in the visitor&apos;s browser while their page is open.</li>
                    <li>Each browser session is its own conversation, so replies always reach the right visitor.</li>
                    <li>No read receipts and no push when the tab is closed — the reply waits for their next visit.</li>
                    <li>Rotating the embed id immediately stops every script tag you have pasted.</li>
                  </ul>
                </div>

                <div className="mt-5">
                  <label className="block text-[12px] font-medium text-ink">Allowed origins</label>
                  <p className="text-[12px] text-mute">
                    Comma-separated list of sites that may embed the widget. Leave blank to allow any site.
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      value={widgetOrigins}
                      onChange={(e) => setWidgetOrigins(e.target.value)}
                      placeholder="https://example.com, https://shop.example.com"
                      className="flex-1 rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-[13px] text-ink outline-none focus:border-ink/40"
                    />
                    <button
                      type="button"
                      onClick={() => void saveWidgetOrigins()}
                      disabled={busy !== null}
                      className="h-8 rounded-lg border border-hairline bg-canvas-elevated px-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer"
                    >
                      {busy === "widget-origins" ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => void setupWidget(true)}
                    disabled={busy !== null}
                    className="h-9 rounded-lg border border-hairline bg-canvas-elevated px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer"
                  >
                    {busy === "widget-setup" ? "Rotating…" : "Rotate Embed ID"}
                  </button>

                  {channelStatus.widget && (
                    <span
                      className={`text-[12.5px] font-medium ${
                        channelStatus.widget.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
                      }`}
                    >
                      {channelStatus.widget.detail}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mt-5 rounded-lg border border-hairline bg-surface-well/50 p-3.5 text-[12.5px] text-body space-y-2">
                  <span className="font-semibold text-ink">Setup Checklist</span>
                  <ul className="list-disc space-y-1 pl-4 text-[12px] text-mute">
                    <li>Click Enable to mint this workspace&apos;s embed code.</li>
                    <li>Paste the script tag before the closing <code className="text-ink font-mono text-[11px]">&lt;/body&gt;</code> tag on your site.</li>
                    <li>Visitors who message you appear in the inbox under the Live Chat channel.</li>
                  </ul>
                </div>

                <div className="mt-5">
                  <label className="block text-[12px] font-medium text-ink">Allowed origins</label>
                  <p className="text-[12px] text-mute">
                    Comma-separated list of sites that may embed the widget. Leave blank to allow any site.
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      value={widgetOrigins}
                      onChange={(e) => setWidgetOrigins(e.target.value)}
                      placeholder="https://example.com, https://shop.example.com"
                      className="flex-1 rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-[13px] text-ink outline-none focus:border-ink/40"
                    />
                    <button
                      type="button"
                      onClick={() => void saveWidgetOrigins()}
                      disabled={busy !== null}
                      className="h-8 rounded-lg border border-hairline bg-canvas-elevated px-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface-well disabled:opacity-50 cursor-pointer"
                    >
                      {busy === "widget-origins" ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => void setupWidget(false)}
                    disabled={busy !== null}
                    className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {busy === "widget-setup" ? "Setting up…" : "Enable Website Widget"}
                  </button>

                  {channelStatus.widget && (
                    <span
                      className={`text-[12.5px] font-medium ${
                        channelStatus.widget.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
                      }`}
                    >
                      {channelStatus.widget.detail}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB 7: WEBHOOKS & ENDPOINTS
         ======================================================================= */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
            <div className="pb-4 border-b border-hairline">
              <h2 className="text-[16px] font-semibold text-ink">Inbound Webhooks &amp; Endpoints</h2>
              <p className="mt-1 text-[12.5px] text-body">
                Copy these endpoint URLs into your respective platform developer consoles to route messages into ConnectMe.
              </p>
            </div>

            <div className="mt-5 space-y-3.5">
              <CopyCard
                label="Meta Webhook Callback URL (WhatsApp, Messenger &amp; Instagram)"
                value={metaUrl}
                hint="Paste into Meta App Dashboard → Webhooks → Edit Subscription → Callback URL"
              />

              <CopyCard
                label="Meta Webhook Verify Token"
                value={data.settings.webhookVerifyToken || "connectme_verify"}
                hint="Must match Verify Token in your Meta Webhooks setup"
              />

              {data.webhookUrls.telegram && (
                <CopyCard
                  label="Telegram Webhook URL"
                  value={data.webhookUrls.telegram}
                  hint="Set automatically via 'Auto-Register Webhook' in the Telegram tab"
                />
              )}

              {data.webhookUrls.discord && (
                <CopyCard
                  label="Discord Interactions Endpoint URL"
                  value={data.webhookUrls.discord}
                  hint="Paste into Discord Developer Portal → General Information → Interactions Endpoint URL"
                />
              )}

              {data.webhookUrls.slack && (
                <CopyCard
                  label="Slack Event Subscriptions Request URL"
                  value={data.webhookUrls.slack}
                  hint="Paste into Slack API Dashboard → Event Subscriptions → Request URL"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workspace automation settings — always visible, independent of channel tabs */}
      <div className="mt-6 rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
        <h2 className="text-[16px] font-semibold text-ink">Workspace Automation</h2>
        <p className="mt-0.5 text-[12.5px] text-body">
          Outbound webhook target, auto-assignment pool, and canned message templates.
        </p>

        <div className="mt-5 grid gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">Webhook URL</label>
            <input
              type="text"
              value={workspaceForm.webhookUrl}
              onChange={(e) =>
                setWorkspaceForm((prev) => ({ ...prev, webhookUrl: e.target.value }))
              }
              placeholder={data.settings.webhookUrl || "https://example.com/hook"}
              className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
            />
            <span className="text-[11px] text-mute">
              Leave empty to disable outbound event delivery.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">Auto-assign agents</label>
            <input
              type="text"
              value={workspaceForm.agents}
              onChange={(e) =>
                setWorkspaceForm((prev) => ({ ...prev, agents: e.target.value }))
              }
              placeholder="alice@example.com, bob@example.com"
              className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
            />
            <span className="text-[11px] text-mute">
              Comma-separated. New conversations round-robin across this list.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">Message templates</label>
            <textarea
              value={workspaceForm.templates}
              onChange={(e) =>
                setWorkspaceForm((prev) => ({ ...prev, templates: e.target.value }))
              }
              placeholder={"One template per line\nThanks for reaching out!\nWe'll get back to you shortly."}
              rows={5}
              className="w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
            />
            <span className="text-[11px] text-mute">One template per line.</span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 pt-4 border-t border-hairline">
          <button
            type="button"
            onClick={() => void saveWorkspace()}
            disabled={busy !== null}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {busy === "save-workspace" ? "Saving…" : "Save Workspace Settings"}
          </button>
        </div>
      </div>

      {/* AI BYOK settings — always visible, independent of channel tabs */}
      <div className="mt-6 rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
        <h2 className="text-[16px] font-semibold text-ink">AI (Bring Your Own Key)</h2>
        <p className="mt-0.5 text-[12.5px] text-body">
          Use your own AI provider key for automated replies. The key is stored encrypted and never shown again.
        </p>

        {data.settings.aiConfigured && (
          <div className="mt-4 rounded-lg border border-hairline bg-surface-well/50 px-3.5 py-2.5 text-[12px] text-body">
            Configured: <strong className="font-mono text-ink">{data.settings.aiProvider}/{data.settings.aiModel}</strong>
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">Provider</label>
            <select
              value={aiForm.aiProvider}
              onChange={(e) =>
                setAiForm((prev) => ({ ...prev, aiProvider: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink focus:border-ink focus:outline-none"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">Model</label>
            <input
              type="text"
              value={aiForm.aiModel}
              onChange={(e) =>
                setAiForm((prev) => ({ ...prev, aiModel: e.target.value }))
              }
              placeholder={
                data.settings.aiModel ||
                AI_MODEL_PLACEHOLDERS[aiForm.aiProvider] ||
                "model-id"
              }
              className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-[12.5px] font-medium text-ink">API Key</label>
            <input
              type="password"
              value={aiForm.aiApiKey}
              onChange={(e) =>
                setAiForm((prev) => ({ ...prev, aiApiKey: e.target.value }))
              }
              placeholder={data.settings.aiConfigured ? "••••" : "sk-..."}
              className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
            />
            <span className="text-[11px] text-mute">
              Leave blank to keep the existing key. Enter an empty save with no key change to update provider/model only.
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 pt-4 border-t border-hairline">
          <button
            type="button"
            onClick={() => void saveAi()}
            disabled={busy !== null}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {busy === "save-ai" ? "Saving…" : "Save AI Settings"}
          </button>
        </div>
      </div>
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isMessenger
              ? "bg-[#1877F2]/10 text-[#1877F2]"
              : isInstagram
                ? "bg-[#E4405F]/10 text-[#E4405F]"
                : "bg-surface-well text-body"
          }`}
        >
          {isMessenger ? (
            <ChannelIcon channel="messenger" className="h-4 w-4" />
          ) : isInstagram ? (
            <ChannelIcon channel="instagram" className="h-4 w-4" />
          ) : (
            <ChannelIcon channel={account.channel} className="h-4 w-4" />
          )}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="truncate text-[13px] font-semibold text-ink">{account.name}</span>
          <span className="text-[11px] text-mute truncate font-mono">
            {isMessenger ? "Facebook Page" : isInstagram ? "Instagram Handle" : account.channel} • ID: {account.externalId}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onDisconnect}
        disabled={isBusy}
        className="self-end sm:self-auto h-7 shrink-0 rounded-md border border-error/30 bg-error/10 px-2.5 text-[11.5px] font-medium text-error transition-colors hover:bg-error/20 active:bg-error/25 disabled:opacity-40 cursor-pointer"
      >
        {isBusy ? "Removing…" : "Disconnect"}
      </button>
    </div>
  );
}

function CopyCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-hairline bg-surface-well/50 p-3.5 space-y-1.5">
      <p className="text-[12px] font-semibold text-ink">{label}</p>
      <div className="flex items-center justify-between gap-2 rounded-md border border-hairline bg-canvas px-3 py-2">
        <code className="truncate font-mono text-[12px] text-ink select-all">{value}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="h-7 shrink-0 rounded-md border border-hairline bg-canvas-elevated px-2.5 text-[11.5px] font-medium text-ink transition-colors hover:bg-surface-well cursor-pointer shadow-2xs"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      {hint && <p className="text-[11px] text-mute">{hint}</p>}
    </div>
  );
}
