"use client";

import { useState } from "react";
import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SettingsPayload } from "@/core/types";

interface TelegramSettingsProps {
  data: SettingsPayload;
  isTelegramConnected: boolean;
  telegramForm: {
    telegramBotToken: string;
    telegramChannelId: string;
  };
  setTelegramForm: React.Dispatch<
    React.SetStateAction<{ telegramBotToken: string; telegramChannelId: string }>
  >;
  visibleSecrets: Record<string, boolean>;
  toggleSecret: (key: string) => void;
  busy: string | null;
  channelStatus: Record<string, { ok: boolean; detail: string }>;
  onSave: () => void;
  onRegisterWebhook: () => void;
}

export function TelegramSettings({
  data,
  isTelegramConnected,
  telegramForm,
  setTelegramForm,
  visibleSecrets,
  toggleSecret,
  busy,
  channelStatus,
  onSave,
  onRegisterWebhook,
}: TelegramSettingsProps) {
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-canvas-elevated">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 shadow-2xs">
              <ChannelIcon channel="telegram" className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink">Telegram Bot Integration</h2>
                <span className="rounded bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] text-mute border border-hairline">
                  Bot API 7.0+
                </span>
              </div>
              <p className="text-[12.5px] text-mute mt-0.5">
                Send and receive two-way direct customer chats and channel broadcasts via your official Telegram bot.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-mute hover:text-ink transition-colors"
            >
              Open @BotFather ↗
            </a>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isTelegramConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isTelegramConnected ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-neutral-400"
                }`}
              />
              {isTelegramConnected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Active Bot Pill */}
          {data.settings.telegramBotId && (
            <div className="rounded-xl border border-hairline bg-surface-well/40 p-4 flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-body">
                  Connected Telegram Bot ID:{" "}
                  <strong className="font-mono text-ink font-semibold">
                    {data.settings.telegramBotId}
                  </strong>
                </span>
              </div>
              <span className="text-mute font-mono text-[11px]">
                Secret Token Verified
              </span>
            </div>
          )}

          {/* Quick Setup Instructions Collapsible */}
          <div className="rounded-xl border border-hairline bg-surface-well/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="w-full px-4 py-3 text-left flex items-center justify-between text-[12.5px] font-medium text-ink hover:bg-surface-well/40 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">📘</span>
                <span>How to setup your Telegram Bot in 2 minutes</span>
              </span>
              <span className="text-mute font-mono text-xs">
                {showSetupGuide ? "Hide Guide ↑" : "Show Guide ↓"}
              </span>
            </button>

            {showSetupGuide && (
              <div className="px-4 pb-4 pt-1 border-t border-hairline space-y-2 text-[12px] text-mute">
                <p>1. Open Telegram and search for <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-ink font-medium underline">@BotFather</a>.</p>
                <p>2. Send <code className="font-mono text-ink">/newbot</code> and follow the prompts to choose a display name and username.</p>
                <p>3. Copy the HTTP API token (format <code className="font-mono text-ink">123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ</code>) and paste it below.</p>
                <p>4. Click <strong>Save Telegram Settings</strong>, then click <strong>Auto-Register Webhook</strong> to connect incoming messages.</p>
              </div>
            )}
          </div>

          {/* Form Inputs Grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-ink">
                Telegram Bot Token <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.telegramBotToken ? "text" : "password"}
                  value={telegramForm.telegramBotToken}
                  onChange={(e) =>
                    setTelegramForm((prev) => ({ ...prev, telegramBotToken: e.target.value }))
                  }
                  placeholder={
                    isTelegramConnected
                      ? "••••••••••••••••••••••••••••••••  (Saved securely)"
                      : "123456789:ABCdef..."
                  }
                  className="h-9 pr-14 font-mono text-[12.5px]"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("telegramBotToken")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mute hover:text-ink cursor-pointer px-1.5 py-0.5 rounded"
                >
                  {visibleSecrets.telegramBotToken ? "Hide" : "Show"}
                </button>
              </div>
              <span className="block text-[11px] text-mute">
                From @BotFather upon bot creation
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-ink">
                Broadcast Channel ID <span className="text-mute font-normal text-[11px]">(Optional)</span>
              </label>
              <Input
                type="text"
                value={telegramForm.telegramChannelId}
                onChange={(e) =>
                  setTelegramForm((prev) => ({ ...prev, telegramChannelId: e.target.value }))
                }
                placeholder="e.g. -1001234567890 or @channelname"
                className="h-9 font-mono text-[12.5px]"
              />
              <span className="block text-[11px] text-mute">
                Optional public or private channel for one-way updates
              </span>
            </div>
          </div>

          {/* Inline Webhook Card & Auto-Register Button */}
          {data.webhookUrls.telegram && (
            <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-[13px] font-semibold text-ink">
                    Telegram Webhook Gateway
                  </h4>
                  <p className="text-[11.5px] text-mute">
                    Webhook receiver URL with encrypted secret token protection.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRegisterWebhook}
                  disabled={busy !== null || !isTelegramConnected}
                  className="h-8 px-3 text-[12px] font-medium cursor-pointer shrink-0"
                >
                  {busy === "register-telegram" ? "Registering…" : "Auto-Register Webhook ⚡"}
                </Button>
              </div>

              <div className="rounded-lg border border-hairline bg-surface-well/60 px-3 py-2 font-mono text-[11.5px] text-body truncate">
                {data.webhookUrls.telegram}/&lt;botId&gt;
              </div>
            </div>
          )}

          {/* Action Toolbar & Feedback */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-hairline">
            <div className="flex items-center gap-2">
              {channelStatus.telegram && (
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-[11.5px] px-2.5 py-1 rounded-md ${
                    channelStatus.telegram.ok
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-error border border-red-500/20"
                  }`}
                >
                  <span>{channelStatus.telegram.ok ? "✓" : "✕"}</span>
                  <span>{channelStatus.telegram.detail}</span>
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={busy !== null}
              className="h-8 px-4 text-[12px] font-semibold cursor-pointer"
            >
              {busy === "save-telegram" ? "Saving…" : "Save Telegram Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
