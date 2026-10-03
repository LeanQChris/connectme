"use client";

import { useSettingsForm } from "../hooks/use-settings-form";
import { SettingsTabs } from "./settings-tabs";
import { WhatsappSettings } from "./whatsapp-settings";
import { MetaSettings } from "./meta-settings";
import { TelegramSettings } from "./telegram-settings";
import { DiscordSettings } from "./discord-settings";
import { NotificationsSettings } from "./notifications-settings";
import { WebhooksSettings } from "./webhooks-settings";
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
    metaUrl,
  } = useSettingsForm(initial);

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

      {/* Global Success Alert */}
      {globalSuccess && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-[13px] text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
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

      {/* Global Error Alert */}
      {globalError && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-[13px] text-error">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
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
      <SettingsTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isWhatsAppConnected={isWhatsAppConnected}
        isMetaConnected={isMetaConnected}
        isTelegramConnected={isTelegramConnected}
        isDiscordConnected={isDiscordConnected}
      />

      {/* Tab Panels */}
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
                webhookVerifyToken: metaForm.webhookVerifyToken,
              },
              "meta",
              "Meta developer keys saved successfully!",
              () =>
                setMetaForm({
                  pageAccessToken: "",
                  metaAppSecret: "",
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

      {activeTab === "notifications" && <NotificationsSettings />}

      {activeTab === "webhooks" && <WebhooksSettings data={data} metaUrl={metaUrl} />}
    </div>
  );
}
