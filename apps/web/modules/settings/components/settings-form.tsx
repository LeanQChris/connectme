"use client";

import { useState, useMemo } from "react";
import { useSettingsForm } from "../hooks/use-settings-form";
import { SettingsTabs } from "./settings-tabs";
import { ChannelsOverview } from "./channels-overview";
import { WhatsappSettings } from "./whatsapp-settings";
import { MetaSettings } from "./meta-settings";
import { TelegramSettings } from "./telegram-settings";
import { DiscordSettings } from "./discord-settings";
import { SlackSettings } from "./slack-settings";
import { NotificationsSettings } from "./notifications-settings";
import { WebhooksSettings } from "./webhooks-settings";
import { AiByokSettings } from "./ai-byok-settings";
import { TeamRbacSettings } from "./team-rbac-settings";
import type { SettingsPayload, SettingsTabId } from "../data/settings.types";

export interface SettingsFormProps {
  initial: SettingsPayload;
}

export default function SettingsForm({ initial }: SettingsFormProps) {
  const {
    data,
    activeTab,
    setActiveTab,
    globalError,
    setGlobalError,
    globalSuccess,
    setGlobalSuccess,
    busy,
    channelStatus,
    visibleSecrets,
    toggleSecret,
    whatsappForm,
    setWhatsappForm,
    metaForm,
    setMetaForm,
    telegramForm,
    setTelegramForm,
    discordForm,
    setDiscordForm,
    slackForm,
    setSlackForm,
    showManualMeta,
    setShowManualMeta,
    saveChannel,
    verifyChannel,
    disconnectAccount,
    registerTelegram,
    registerDiscord,
    isWhatsAppConnected,
    isMetaConnected,
    isTelegramConnected,
    isDiscordConnected,
    isSlackConnected,
    metaUrl,
    slackUrl,
  } = useSettingsForm(initial);

  const [searchFilter, setSearchFilter] = useState("");

  const currentMetaAccountsCount =
    data.settings.accounts?.filter(
      (a) => a.channel === "messenger" || a.channel === "instagram",
    ).length || 0;

  const connectedChannelsCount = [
    isWhatsAppConnected,
    isMetaConnected,
    isTelegramConnected,
    isDiscordConnected,
    isSlackConnected,
  ].filter(Boolean).length;

  // Search filter list to quickly jump to settings
  const searchableSections = useMemo(() => [
    { id: "overview" as SettingsTabId, label: "Overview & Connected Accounts", keywords: "all accounts status health channels" },
    { id: "whatsapp" as SettingsTabId, label: "WhatsApp Cloud API", keywords: "whatsapp phone access token meta wa business" },
    { id: "meta" as SettingsTabId, label: "Facebook & Instagram", keywords: "meta facebook messenger instagram page token secret oauth" },
    { id: "telegram" as SettingsTabId, label: "Telegram Bot", keywords: "telegram bot token webhook channel chat botfather" },
    { id: "discord" as SettingsTabId, label: "Discord Bot", keywords: "discord bot token public key slash command guild" },
    { id: "slack" as SettingsTabId, label: "Slack Workspace", keywords: "slack bot oauth signing secret events workspace" },
    { id: "ai" as SettingsTabId, label: "AI Copilot & BYOK Router", keywords: "ai openai claude gemini openrouter ollama byok routing fallback prompt" },
    { id: "team" as SettingsTabId, label: "Team & Permissions (RBAC)", keywords: "team users rbac roles members permissions invite" },
    { id: "webhooks" as SettingsTabId, label: "Webhooks & Endpoints", keywords: "webhooks endpoints urls callback verify token security" },
    { id: "notifications" as SettingsTabId, label: "Notifications & PWA", keywords: "notifications sound chime pwa push desktop alerts" },
  ], []);

  const searchResults = useMemo(() => {
    if (!searchFilter.trim()) return [];
    const q = searchFilter.toLowerCase();
    return searchableSections.filter(
      (s) => s.label.toLowerCase().includes(q) || s.keywords.includes(q),
    );
  }, [searchFilter, searchableSections]);

  return (
    <div className="w-full space-y-6">
      {/* Sleek Workspace Header */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[12px] font-mono text-mute">
              <span>ConnectMe</span>
              <span>/</span>
              <span>Workspace</span>
              <span>/</span>
              <span className="text-ink font-semibold">Settings</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-ink">
              Workspace & Channels Settings
            </h1>
            <p className="text-[13px] text-mute">
              Manage omnichannel integrations, AI BYOK routing keys, team access, and incoming webhooks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Health Status Pill */}
            <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface-well/50 px-3 py-1.5 font-mono text-[12px]">
              <span
                className={`h-2 w-2 rounded-full ${
                  connectedChannelsCount > 0
                    ? "bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse"
                    : "bg-neutral-400"
                }`}
              />
              <span className="text-body font-medium">
                {connectedChannelsCount} of 5 Channels Live
              </span>
            </div>

            {/* Quick Search Input */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Jump to setting or key..."
                className="h-8 w-full rounded-lg border border-hairline bg-canvas px-3 pl-8 text-[12.5px] text-ink placeholder:text-mute focus:border-ink/40 focus:outline-none focus:ring-1 focus:ring-ink/20"
              />
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-mute pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-mute hover:text-ink cursor-pointer"
                >
                  ✕
                </button>
              )}

              {/* Quick Jump Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-lg border border-hairline bg-canvas-elevated shadow-lg p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(res.id);
                        setSearchFilter("");
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] text-ink hover:bg-surface-well flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-medium">{res.label}</span>
                      <span className="text-[10px] font-mono text-mute">Jump →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Notification Alerts */}
      {globalSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-600 dark:text-emerald-400 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-xs">
              ✓
            </span>
            <span className="font-medium">{globalSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalSuccess(null)}
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-xs font-semibold cursor-pointer px-1.5 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {globalError && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-error shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 font-bold text-xs">
              ✕
            </span>
            <span className="font-medium">{globalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-error text-xs font-semibold cursor-pointer hover:opacity-80 px-1.5 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] lg:grid-cols-[250px_1fr] gap-8 items-start">
        {/* Left Column: Fixed/Sticky Sidebar Navigation */}
        <aside className="w-full md:sticky md:top-20">
          <SettingsTabs
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            isWhatsAppConnected={isWhatsAppConnected}
            isMetaConnected={isMetaConnected}
            isTelegramConnected={isTelegramConnected}
            isDiscordConnected={isDiscordConnected}
            isSlackConnected={isSlackConnected}
            isAiConnected={Boolean(data.settings.ai?.configured)}
            metaAccountsCount={currentMetaAccountsCount}
          />
        </aside>

        {/* Right Column: Active Settings Tab Content */}
        <div className="w-full min-w-0">
          {activeTab === "overview" && (
            <ChannelsOverview
              data={data}
              isWhatsAppConnected={isWhatsAppConnected}
              isMetaConnected={isMetaConnected}
              isTelegramConnected={isTelegramConnected}
              isDiscordConnected={isDiscordConnected}
              isSlackConnected={isSlackConnected}
              onNavigateTab={setActiveTab}
              onDisconnectAccount={disconnectAccount}
              busy={busy}
            />
          )}

          {activeTab === "ai" && (
            <AiByokSettings
              initialConfig={data.settings.ai}
              saving={Boolean(busy)}
              onSave={async (secrets) => {
                await saveChannel(secrets, "ai", "AI Copilot settings updated successfully!");
              }}
            />
          )}

          {activeTab === "whatsapp" && (
            <WhatsappSettings
              data={data}
              isWhatsAppConnected={isWhatsAppConnected}
              whatsappForm={whatsappForm}
              setWhatsappForm={setWhatsappForm}
              visibleSecrets={visibleSecrets}
              toggleSecret={toggleSecret}
              busy={busy}
              channelStatus={channelStatus}
              onSave={() =>
                saveChannel(
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
              onVerify={() => verifyChannel("whatsapp")}
            />
          )}

          {activeTab === "meta" && (
            <MetaSettings
              data={data}
              isMetaConnected={isMetaConnected}
              metaForm={metaForm}
              setMetaForm={setMetaForm}
              showManualMeta={showManualMeta}
              setShowManualMeta={setShowManualMeta}
              visibleSecrets={visibleSecrets}
              toggleSecret={toggleSecret}
              busy={busy}
              channelStatus={channelStatus}
              onSave={() =>
                saveChannel(
                  {
                    pageAccessToken: metaForm.pageAccessToken,
                    metaAppSecret: metaForm.metaAppSecret,
                    instagramAppSecret: metaForm.instagramAppSecret,
                    webhookVerifyToken: metaForm.webhookVerifyToken,
                  },
                  "meta",
                  "Meta & Instagram developer keys saved successfully!",
                  () =>
                    setMetaForm({
                      pageAccessToken: "",
                      metaAppSecret: "",
                      instagramAppSecret: "",
                      webhookVerifyToken: "",
                    }),
                )
              }
              onVerify={() => verifyChannel("page")}
              onDisconnectAccount={disconnectAccount}
            />
          )}

          {activeTab === "telegram" && (
            <TelegramSettings
              data={data}
              isTelegramConnected={isTelegramConnected}
              telegramForm={telegramForm}
              setTelegramForm={setTelegramForm}
              visibleSecrets={visibleSecrets}
              toggleSecret={toggleSecret}
              busy={busy}
              channelStatus={channelStatus}
              onSave={() =>
                saveChannel(
                  {
                    telegramBotToken: telegramForm.telegramBotToken,
                    telegramChannelId: telegramForm.telegramChannelId,
                  },
                  "telegram",
                  "Telegram bot token saved successfully!",
                  () => setTelegramForm({ telegramBotToken: "", telegramChannelId: "" }),
                )
              }
              onRegisterWebhook={registerTelegram}
            />
          )}

          {activeTab === "discord" && (
            <DiscordSettings
              isDiscordConnected={isDiscordConnected}
              discordForm={discordForm}
              setDiscordForm={setDiscordForm}
              visibleSecrets={visibleSecrets}
              toggleSecret={toggleSecret}
              busy={busy}
              channelStatus={channelStatus}
              onSave={() =>
                saveChannel(
                  {
                    discordBotToken: discordForm.discordBotToken,
                    discordPublicKey: discordForm.discordPublicKey,
                    discordChannelId: discordForm.discordChannelId,
                  },
                  "discord",
                  "Discord settings saved successfully!",
                  () =>
                    setDiscordForm({
                      discordBotToken: "",
                      discordPublicKey: "",
                      discordChannelId: "",
                    }),
                )
              }
              onRegisterSlash={registerDiscord}
            />
          )}

          {activeTab === "slack" && (
            <SlackSettings
              isSlackConnected={isSlackConnected}
              slackBotId={data.settings.slackBotId ?? null}
              slackForm={slackForm}
              setSlackForm={setSlackForm}
              visibleSecrets={visibleSecrets}
              toggleSecret={toggleSecret}
              busy={busy}
              channelStatus={channelStatus}
              webhookUrl={slackUrl}
              onSave={() =>
                saveChannel(
                  {
                    slackBotToken: slackForm.slackBotToken,
                    slackSigningSecret: slackForm.slackSigningSecret,
                  },
                  "slack",
                  "Slack settings saved successfully!",
                  () => setSlackForm({ slackBotToken: "", slackSigningSecret: "" }),
                )
              }
              onVerify={() => verifyChannel("slack")}
            />
          )}

          {activeTab === "team" && <TeamRbacSettings />}

          {activeTab === "notifications" && <NotificationsSettings />}

          {activeTab === "webhooks" && <WebhooksSettings data={data} metaUrl={metaUrl} />}
        </div>
      </div>
    </div>
  );
}
