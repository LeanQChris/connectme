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
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <ChannelIcon channel="telegram" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Telegram Bot</h2>
              <p className="text-[12.5px] text-mute mt-0.5">
                Receive and send customer direct messages and channel broadcasts.
              </p>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isTelegramConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isTelegramConnected ? "bg-emerald-500" : "bg-neutral-400"}`} />
              {isTelegramConnected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
          {data.settings.telegramBotId && (
            <div className="rounded-lg border border-hairline bg-surface-well/40 px-3.5 py-2 text-[12px] text-body">
              Active Bot Router ID: <strong className="font-mono text-ink font-semibold">{data.settings.telegramBotId}</strong>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
                Telegram Bot Token <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.telegramBotToken ? "text" : "password"}
                  value={telegramForm.telegramBotToken}
                  onChange={(e) =>
                    setTelegramForm((prev) => ({ ...prev, telegramBotToken: e.target.value }))
                  }
                  placeholder={isTelegramConnected ? "••••••••••••••••••••••••••••••••  (Saved)" : "123456789:ABC..."}
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
                From{" "}
                <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-ink underline">
                  @BotFather
                </a>{" "}
                on Telegram
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
                Default Channel ID <span className="text-mute font-normal">(Optional for broadcasts)</span>
              </label>
              <Input
                type="text"
                value={telegramForm.telegramChannelId}
                onChange={(e) =>
                  setTelegramForm((prev) => ({ ...prev, telegramChannelId: e.target.value }))
                }
                placeholder="e.g. -1001234567890"
                className="h-9 font-mono text-[12.5px]"
              />
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-6 py-3.5 bg-surface-well/30 border-t border-hairline flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={busy !== null}
              className="h-8 px-4 cursor-pointer text-[12.5px] font-medium"
            >
              {busy === "save-telegram" ? "Saving…" : "Save Changes"}
            </Button>

            {isTelegramConnected && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRegisterWebhook}
                disabled={busy !== null}
                className="h-8 px-3 cursor-pointer text-[12px]"
              >
                {busy === "telegram-webhook" ? "Registering…" : "Auto-Register Webhook"}
              </Button>
            )}
          </div>

          <div className="space-y-0.5 text-right text-[11.5px] font-medium">
            {channelStatus.telegram && (
              <div className={channelStatus.telegram.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"}>
                {channelStatus.telegram.detail}
              </div>
            )}
            {channelStatus["telegram-webhook"] && (
              <div className={channelStatus["telegram-webhook"].ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"}>
                {channelStatus["telegram-webhook"].detail}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
