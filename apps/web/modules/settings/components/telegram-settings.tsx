"use client";

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
  return (
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
            <span
              className={`h-1.5 w-1.5 rounded-full ${isTelegramConnected ? "bg-emerald-500" : "bg-neutral-400"}`}
            />
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
              <Input
                type={visibleSecrets.telegramBotToken ? "text" : "password"}
                value={telegramForm.telegramBotToken}
                onChange={(e) =>
                  setTelegramForm((prev) => ({ ...prev, telegramBotToken: e.target.value }))
                }
                placeholder={isTelegramConnected ? "••••••••••••  (Active & Encrypted)" : "123456789:ABCdefGHIjklMNOpqr..."}
                className="pr-10"
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
              Obtained from{" "}
              <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-ink underline">
                @BotFather
              </a>{" "}
               on Telegram
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">
              Channel / Chat ID for scheduled posts
            </label>
            <Input
              type="text"
              value={telegramForm.telegramChannelId}
              onChange={(e) =>
                setTelegramForm((prev) => ({ ...prev, telegramChannelId: e.target.value }))
              }
              placeholder="e.g. -1001234567890"
            />
            <span className="text-[11px] text-mute">
              Add the bot as an admin of the target channel, then paste its chat id. Leave blank to
              keep the current target.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-hairline">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={onSave}
                disabled={busy !== null}
              >
                {busy === "save-telegram" ? "Saving…" : "Save Telegram Token"}
              </Button>

              {isTelegramConnected && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRegisterWebhook}
                  disabled={busy !== null}
                >
                  {busy === "telegram-webhook" ? "Registering…" : "Auto-Register Webhook"}
                </Button>
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
  );
}
