"use client";

import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DiscordSettingsProps {
  isDiscordConnected: boolean;
  discordForm: {
    discordBotToken: string;
    discordPublicKey: string;
  };
  setDiscordForm: React.Dispatch<
    React.SetStateAction<{
      discordBotToken: string;
      discordPublicKey: string;
    }>
  >;
  visibleSecrets: Record<string, boolean>;
  toggleSecret: (key: string) => void;
  busy: string | null;
  channelStatus: Record<string, { ok: boolean; detail: string }>;
  onSave: () => void;
  onRegisterSlash: () => void;
}

export function DiscordSettings({
  isDiscordConnected,
  discordForm,
  setDiscordForm,
  visibleSecrets,
  toggleSecret,
  busy,
  channelStatus,
  onSave,
  onRegisterSlash,
}: DiscordSettingsProps) {
  return (
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
            <span
              className={`h-1.5 w-1.5 rounded-full ${isDiscordConnected ? "bg-emerald-500" : "bg-neutral-400"}`}
            />
            {isDiscordConnected ? "Connected" : "Not connected"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">
              Discord Bot Token <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Input
                type={visibleSecrets.discordBotToken ? "text" : "password"}
                value={discordForm.discordBotToken}
                onChange={(e) =>
                  setDiscordForm((prev) => ({ ...prev, discordBotToken: e.target.value }))
                }
                placeholder={isDiscordConnected ? "••••••••••••  (Active & Encrypted)" : "MTA..."}
                className="pr-10"
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
            <Input
              type="text"
              value={discordForm.discordPublicKey}
              onChange={(e) =>
                setDiscordForm((prev) => ({ ...prev, discordPublicKey: e.target.value }))
              }
              placeholder="General Information → Public Key"
            />
            <span className="text-[11px] text-mute">Used to verify Discord interaction signatures</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={onSave}
              disabled={busy !== null}
            >
              {busy === "save-discord" ? "Saving…" : "Save Discord Settings"}
            </Button>

            {isDiscordConnected && (
              <Button
                type="button"
                variant="outline"
                onClick={onRegisterSlash}
                disabled={busy !== null}
              >
                {busy === "discord-slash" ? "Registering…" : "Register /connectme Command"}
              </Button>
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
  );
}
