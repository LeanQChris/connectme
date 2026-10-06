"use client";

import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DiscordSettingsProps {
  isDiscordConnected: boolean;
  discordForm: {
    discordBotToken: string;
    discordPublicKey: string;
    discordChannelId: string;
  };
  setDiscordForm: React.Dispatch<
    React.SetStateAction<{
      discordBotToken: string;
      discordPublicKey: string;
      discordChannelId: string;
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
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5865F2]/10 text-[#5865F2]">
              <ChannelIcon channel="discord" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Discord Bot</h2>
              <p className="text-[12.5px] text-mute mt-0.5">
                Connect server guild channels and enable the /connectme slash command.
              </p>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isDiscordConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isDiscordConnected ? "bg-emerald-500" : "bg-neutral-400"}`} />
              {isDiscordConnected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
                Discord Bot Token <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.discordBotToken ? "text" : "password"}
                  value={discordForm.discordBotToken}
                  onChange={(e) =>
                    setDiscordForm((prev) => ({ ...prev, discordBotToken: e.target.value }))
                  }
                  placeholder={isDiscordConnected ? "••••••••••••••••••••••••••••••••  (Saved)" : "MTA..."}
                  className="h-9 pr-14 font-mono text-[12.5px]"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("discordBotToken")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mute hover:text-ink cursor-pointer px-1.5 py-0.5 rounded"
                >
                  {visibleSecrets.discordBotToken ? "Hide" : "Show"}
                </button>
              </div>
              <span className="block text-[11px] text-mute">From Discord Portal → Bot → Token</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
                Discord Public Key <span className="text-error">*</span>
              </label>
              <Input
                type="text"
                value={discordForm.discordPublicKey}
                onChange={(e) =>
                  setDiscordForm((prev) => ({ ...prev, discordPublicKey: e.target.value }))
                }
                placeholder="General Information → Public Key"
                className="h-9 font-mono text-[12.5px]"
              />
              <span className="block text-[11px] text-mute">Used for Ed25519 payload verification</span>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-[12.5px] font-medium text-ink">
                Default Channel ID <span className="text-mute font-normal">(Optional for broadcasts)</span>
              </label>
              <Input
                type="text"
                value={discordForm.discordChannelId}
                onChange={(e) =>
                  setDiscordForm((prev) => ({ ...prev, discordChannelId: e.target.value }))
                }
                placeholder="e.g. 123456789012345678"
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
              {busy === "save-discord" ? "Saving…" : "Save Changes"}
            </Button>

            {isDiscordConnected && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRegisterSlash}
                disabled={busy !== null}
                className="h-8 px-3 cursor-pointer text-[12px]"
              >
                {busy === "discord-slash" ? "Registering…" : "Register /connectme"}
              </Button>
            )}
          </div>

          <div className="space-y-0.5 text-right text-[11.5px] font-medium">
            {channelStatus.discord && (
              <div className={channelStatus.discord.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"}>
                {channelStatus.discord.detail}
              </div>
            )}
            {channelStatus["discord-slash"] && (
              <div className={channelStatus["discord-slash"].ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"}>
                {channelStatus["discord-slash"].detail}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
