"use client";

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
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4A154B]/10 dark:bg-[#E01E5A]/10 text-[#4A154B] dark:text-[#E01E5A]">
              <ChannelIcon channel="slack" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Slack Workspace</h2>
              <p className="text-[12.5px] text-mute mt-0.5">
                Stream channel messages and agent responses from your Slack workspace.
              </p>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isSlackConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isSlackConnected ? "bg-emerald-500" : "bg-neutral-400"}`} />
              {isSlackConnected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
          {slackBotId && (
            <div className="rounded-lg border border-hairline bg-surface-well/40 px-3.5 py-2 text-[12px] text-body">
              Workspace / Bot ID: <strong className="font-mono text-ink font-semibold">{slackBotId}</strong>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
                Bot User OAuth Token <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.slackBotToken ? "text" : "password"}
                  value={slackForm.slackBotToken}
                  onChange={(e) =>
                    setSlackForm((prev) => ({ ...prev, slackBotToken: e.target.value }))
                  }
                  placeholder={isSlackConnected ? "••••••••••••••••••••••••••••••••  (Saved)" : "xoxb-..."}
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
                OAuth Scopes: <code className="font-mono text-ink">chat:write</code>, <code className="font-mono text-ink">channels:history</code>
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
                Signing Secret <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.slackSigningSecret ? "text" : "password"}
                  value={slackForm.slackSigningSecret}
                  onChange={(e) =>
                    setSlackForm((prev) => ({ ...prev, slackSigningSecret: e.target.value }))
                  }
                  placeholder={isSlackConnected ? "••••••••••••••••••••••••••••••••  (Saved)" : "Signing secret..."}
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
              <span className="block text-[11px] text-mute">From Basic Information → App Credentials</span>
            </div>
          </div>

          <div>
            <CopyCard
              label="Events API Request URL"
              value={webhookUrl}
              hint="Paste into Event Subscriptions → Enable Events and subscribe to message.channels and app_mention."
            />
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
              {busy === "save-slack" ? "Saving…" : "Save Changes"}
            </Button>

            {isSlackConnected && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onVerify}
                disabled={busy !== null}
                className="h-8 px-3 cursor-pointer text-[12px]"
              >
                {busy === "verify-slack" ? "Verifying…" : "Test Connection"}
              </Button>
            )}
          </div>

          {channelStatus.slack && (
            <div
              className={`text-[12px] font-medium flex items-center gap-1 ${
                channelStatus.slack.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
              }`}
            >
              <span>{channelStatus.slack.ok ? "✓" : "!"}</span>
              <span>{channelStatus.slack.detail}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}