"use client";

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
import type { SettingsPayload } from "@/core/types";

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

  const currentMetaAccountsCount =
    data.settings.accounts?.filter(
      (a) => a.channel === "messenger" || a.channel === "instagram",
    ).length || 0;

  return (
    <div className="w-full space-y-6">
      {/* Clean Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-hairline">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">Settings</h1>
          <p className="text-[13px] text-mute mt-0.5">
            Configure omnichannel inbox credentials, AI router keys, and workspace preferences.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {globalSuccess && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{globalSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalSuccess(null)}
            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-xs font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {globalError && (
        <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-error">
          <div className="flex items-center gap-2">
            <span>✕</span>
            <span>{globalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-error text-xs font-semibold cursor-pointer hover:opacity-80"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Clean Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr] gap-8 items-start">
        {/* Left Column: Minimal Sidebar Navigation */}
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
