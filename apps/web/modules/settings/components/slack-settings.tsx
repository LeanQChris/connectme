"use client";

import { useState } from "react";
import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyCard } from "./copy-card";

interface SlackSettingsProps {
  isSlackConnected: boolean;
  slackBotId: string | null;
  slackForm: {
    slackBotToken: string;
    slackSigningSecret: string;
  };
  setSlackForm: React.Dispatch<
    React.SetStateAction<{ slackBotToken: string; slackSigningSecret: string }>
  >;
  visibleSecrets: Record<string, boolean>;
  toggleSecret: (key: string) => void;
  busy: string | null;
  channelStatus: Record<string, { ok: boolean; detail: string }>;
  webhookUrl: string;
  onSave: () => void;
  onVerify: () => void;
}

export function SlackSettings({
  isSlackConnected,
  slackBotId,
  slackForm,
  setSlackForm,
  visibleSecrets,
  toggleSecret,
  busy,
  channelStatus,
  webhookUrl,
  onSave,
  onVerify,
}: SlackSettingsProps) {
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-canvas-elevated">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4A154B]/10 dark:bg-[#E01E5A]/10 text-[#4A154B] dark:text-[#E01E5A] shadow-2xs">
              <ChannelIcon channel="slack" className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink">Slack Workspace Integration</h2>
                <span className="rounded bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] text-mute border border-hairline">
                  Events API
                </span>
              </div>
              <p className="text-[12.5px] text-mute mt-0.5">
                Stream messages from channels and direct messages with real-time bidirectional syncing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="https://api.slack.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-mute hover:text-ink transition-colors"
            >
              Slack API Console ↗
            </a>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isSlackConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isSlackConnected ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-neutral-400"
                }`}
              />
              {isSlackConnected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Active Workspace / Bot Pill */}
          {slackBotId && (
            <div className="rounded-xl border border-hairline bg-surface-well/40 p-4 flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-body">
                  Connected Slack Workspace ID:{" "}
                  <strong className="font-mono text-ink font-semibold">{slackBotId}</strong>
                </span>
              </div>
              <span className="text-mute font-mono text-[11px]">
                Events Subscribed
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
                <span>How to configure your Slack App</span>
              </span>
              <span className="text-mute font-mono text-xs">
                {showSetupGuide ? "Hide Guide ↑" : "Show Guide ↓"}
              </span>
            </button>

            {showSetupGuide && (
              <div className="px-4 pb-4 pt-1 border-t border-hairline space-y-2 text-[12px] text-mute">
                <p>1. In <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-ink underline">Slack App Management</a>, click <strong>Create New App</strong> &rarr; From scratch.</p>
                <p>2. In <strong>Event Subscriptions</strong>, toggle ON and paste the Request URL provided below.</p>
                <p>3. Under <strong>Subscribe to bot events</strong>, add: <code className="font-mono text-ink">message.channels</code>, <code className="font-mono text-ink">message.groups</code>, and <code className="font-mono text-ink">message.im</code>.</p>
                <p>4. In <strong>OAuth & Permissions</strong>, install the app to your workspace and copy the <strong>Bot User OAuth Token</strong> (<code className="font-mono text-ink">xoxb-...</code>).</p>
                <p>5. In <strong>Basic Information</strong>, copy the <strong>Signing Secret</strong> for HMAC payload validation.</p>
              </div>
            )}
          </div>

          {/* Form Inputs Grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-ink">
                Bot User OAuth Token <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.slackBotToken ? "text" : "password"}
                  value={slackForm.slackBotToken}
                  onChange={(e) =>
                    setSlackForm((prev) => ({ ...prev, slackBotToken: e.target.value }))
                  }
                  placeholder={
                    isSlackConnected
                      ? "••••••••••••••••••••••••••••••••  (Saved securely)"
                      : "xoxb-..."
                  }
                  className="h-9 pr-14 font-mono text-[12.5px]"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("slackBotToken")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mute hover:text-ink cursor-pointer px-1.5 py-0.5 rounded"
                >
                  {visibleSecrets.slackBotToken ? "Hide" : "Show"}
                </button>
              </div>
              <span className="block text-[11px] text-mute">
                From OAuth & Permissions &rarr; Bot User OAuth Token
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-ink">
                Slack Signing Secret <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.slackSigningSecret ? "text" : "password"}
                  value={slackForm.slackSigningSecret}
                  onChange={(e) =>
                    setSlackForm((prev) => ({ ...prev, slackSigningSecret: e.target.value }))
                  }
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="h-9 pr-14 font-mono text-[12.5px]"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("slackSigningSecret")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mute hover:text-ink cursor-pointer px-1.5 py-0.5 rounded"
                >
                  {visibleSecrets.slackSigningSecret ? "Hide" : "Show"}
                </button>
              </div>
              <span className="block text-[11px] text-mute">
                From Basic Information &rarr; App Credentials &rarr; Signing Secret
              </span>
            </div>
          </div>

          {/* Inline Webhook Card */}
          {webhookUrl && (
            <div className="pt-1">
              <CopyCard
                label="Slack Event Subscriptions Request URL"
                value={webhookUrl}
                hint="Paste this URL into Event Subscriptions &rarr; Request URL in your Slack App Console."
                badge="Events API"
              />
            </div>
          )}

          {/* Action Toolbar & Feedback */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-hairline">
            <div className="flex items-center gap-2">
              {channelStatus.slack && (
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-[11.5px] px-2.5 py-1 rounded-md ${
                    channelStatus.slack.ok
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-error border border-red-500/20"
                  }`}
                >
                  <span>{channelStatus.slack.ok ? "✓" : "✕"}</span>
                  <span>{channelStatus.slack.detail}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onVerify}
                disabled={busy !== null || !isSlackConnected}
                className="h-8 px-3 text-[12px] font-medium cursor-pointer"
              >
                {busy === "verify-slack" ? "Testing…" : "Test Slack Bot (auth.test)"}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onSave}
                disabled={busy !== null}
                className="h-8 px-4 text-[12px] font-semibold cursor-pointer"
              >
                {busy === "save-slack" ? "Saving…" : "Save Slack Settings"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
