"use client";

import { useState } from "react";
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
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-canvas-elevated">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/10 text-[#5865F2] shadow-2xs">
              <ChannelIcon channel="discord" className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink">Discord Bot & Slash Commands</h2>
                <span className="rounded bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] text-mute border border-hairline">
                  Gateway v10
                </span>
              </div>
              <p className="text-[12.5px] text-mute mt-0.5">
                Connect your Discord community server, receive support requests, and respond via unified inbox.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-mute hover:text-ink transition-colors"
            >
              Discord Portal ↗
            </a>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isDiscordConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isDiscordConnected ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-neutral-400"
                }`}
              />
              {isDiscordConnected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Quick Setup Instructions Collapsible */}
          <div className="rounded-xl border border-hairline bg-surface-well/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="w-full px-4 py-3 text-left flex items-center justify-between text-[12.5px] font-medium text-ink hover:bg-surface-well/40 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">📘</span>
                <span>How to configure Discord Bot & Interactions</span>
              </span>
              <span className="text-mute font-mono text-xs">
                {showSetupGuide ? "Hide Guide ↑" : "Show Guide ↓"}
              </span>
            </button>

            {showSetupGuide && (
              <div className="px-4 pb-4 pt-1 border-t border-hairline space-y-2 text-[12px] text-mute">
                <p>1. In <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-ink underline">Discord Developer Portal</a>, create a New Application.</p>
                <p>2. In <strong>General Information</strong>, copy the <strong>Public Key</strong> (used for cryptographic Ed25519 interaction signatures).</p>
                <p>3. In <strong>Bot</strong>, reset and copy the <strong>Bot Token</strong>, then toggle ON <strong>Message Content Intent</strong>.</p>
                <p>4. Set <strong>Interactions Endpoint URL</strong> to your ConnectMe Discord webhook.</p>
                <p>5. Save credentials below and click <strong>Register /connectme Slash Command</strong>.</p>
              </div>
            )}
          </div>

          {/* Form Inputs Grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-ink">
                Discord Bot Token <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.discordBotToken ? "text" : "password"}
                  value={discordForm.discordBotToken}
                  onChange={(e) =>
                    setDiscordForm((prev) => ({ ...prev, discordBotToken: e.target.value }))
                  }
                  placeholder={
                    isDiscordConnected
                      ? "••••••••••••••••••••••••••••••••  (Saved securely)"
                      : "MTA..."
                  }
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
              <span className="block text-[11px] text-mute">From Discord Portal &rarr; Bot &rarr; Token</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-ink">
                Public Key (Ed25519) <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.discordPublicKey ? "text" : "password"}
                  value={discordForm.discordPublicKey}
                  onChange={(e) =>
                    setDiscordForm((prev) => ({ ...prev, discordPublicKey: e.target.value }))
                  }
                  placeholder="e.g. 64-character hex key"
                  className="h-9 pr-14 font-mono text-[12.5px]"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("discordPublicKey")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mute hover:text-ink cursor-pointer px-1.5 py-0.5 rounded"
                >
                  {visibleSecrets.discordPublicKey ? "Hide" : "Show"}
                </button>
              </div>
              <span className="block text-[11px] text-mute">From General Information &rarr; Public Key</span>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-[12.5px] font-semibold text-ink">
                Default Channel ID <span className="text-mute font-normal text-[11px]">(Optional)</span>
              </label>
              <Input
                type="text"
                value={discordForm.discordChannelId}
                onChange={(e) =>
                  setDiscordForm((prev) => ({ ...prev, discordChannelId: e.target.value }))
                }
                placeholder="e.g. 109283019283019283"
                className="h-9 font-mono text-[12.5px]"
              />
              <span className="block text-[11px] text-mute">
                Right-click a channel in Discord with Developer Mode enabled &rarr; Copy Channel ID
              </span>
            </div>
          </div>

          {/* Slash Command Registration Card */}
          <div className="rounded-xl border border-hairline bg-canvas p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-[13px] font-semibold text-ink">
                Global Slash Command (/connectme)
              </h4>
              <p className="text-[11.5px] text-mute">
                Registers the <code className="font-mono text-ink">/connectme message:...</code> command globally across all servers your bot joins.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRegisterSlash}
              disabled={busy !== null || !isDiscordConnected}
              className="h-8 px-3.5 text-[12px] font-medium cursor-pointer shrink-0"
            >
              {busy === "register-discord" ? "Registering…" : "Register Command ⚡"}
            </Button>
          </div>

          {/* Action Toolbar & Feedback */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-hairline">
            <div className="flex items-center gap-2">
              {channelStatus.discord && (
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-[11.5px] px-2.5 py-1 rounded-md ${
                    channelStatus.discord.ok
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-error border border-red-500/20"
                  }`}
                >
                  <span>{channelStatus.discord.ok ? "✓" : "✕"}</span>
                  <span>{channelStatus.discord.detail}</span>
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
              {busy === "save-discord" ? "Saving…" : "Save Discord Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
