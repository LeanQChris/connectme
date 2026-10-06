"use client";

import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import { AccountRow } from "./account-row";
import type { SettingsPayload, SettingsTabId } from "../data/settings.types";

interface ChannelsOverviewProps {
  data: SettingsPayload;
  isWhatsAppConnected: boolean;
  isMetaConnected: boolean;
  isTelegramConnected: boolean;
  isDiscordConnected: boolean;
  isSlackConnected: boolean;
  onNavigateTab: (tab: SettingsTabId) => void;
  onDisconnectAccount: (accountId: string) => void;
  busy: string | null;
}

export function ChannelsOverview({
  data,
  isWhatsAppConnected,
  isMetaConnected,
  isTelegramConnected,
  isDiscordConnected,
  isSlackConnected,
  onNavigateTab,
  onDisconnectAccount,
  busy,
}: ChannelsOverviewProps) {
  const isAiConnected = Boolean(data.settings.ai?.configured);

  const providers = [
    {
      id: "whatsapp" as SettingsTabId,
      name: "WhatsApp Cloud API",
      channel: "whatsapp" as const,
      icon: <ChannelIcon channel="whatsapp" className="h-5 w-5 text-whatsapp" />,
      bg: "bg-whatsapp/10",
      connected: isWhatsAppConnected,
      detail: data.settings.waPhoneNumberId
        ? `Phone ID: ${data.settings.waPhoneNumberId}`
        : "Not configured",
      type: "Meta Cloud API",
    },
    {
      id: "meta" as SettingsTabId,
      name: "Facebook & Instagram",
      channel: "messenger" as const,
      icon: <ChannelIcon channel="messenger" className="h-5 w-5 text-messenger" />,
      bg: "bg-messenger/10",
      connected: isMetaConnected,
      detail:
        data.settings.accounts?.filter(
          (a) => a.channel === "messenger" || a.channel === "instagram",
        ).length
          ? `${
              data.settings.accounts.filter(
                (a) => a.channel === "messenger" || a.channel === "instagram",
              ).length
            } Page(s) & Handle(s) linked`
          : "Not connected",
      type: "Meta Graph API",
    },
    {
      id: "telegram" as SettingsTabId,
      name: "Telegram Bot",
      channel: "telegram" as const,
      icon: <ChannelIcon channel="telegram" className="h-5 w-5 text-sky-500" />,
      bg: "bg-sky-500/10",
      connected: isTelegramConnected,
      detail: data.settings.telegramBotId
        ? `Bot ID: ${data.settings.telegramBotId}`
        : isTelegramConnected
          ? "Bot Token Saved"
          : "Not configured",
      type: "Telegram Bot API",
    },
    {
      id: "discord" as SettingsTabId,
      name: "Discord Bot",
      channel: "discord" as const,
      icon: <ChannelIcon channel="discord" className="h-5 w-5 text-[#5865F2]" />,
      bg: "bg-[#5865F2]/10",
      connected: isDiscordConnected,
      detail: isDiscordConnected ? "Bot & Slash Commands linked" : "Not configured",
      type: "Discord Gateway / REST",
    },
    {
      id: "slack" as SettingsTabId,
      name: "Slack Workspace",
      channel: "slack" as const,
      icon: (
        <ChannelIcon
          channel="slack"
          className="h-5 w-5 text-[#4A154B] dark:text-[#E01E5A]"
        />
      ),
      bg: "bg-[#4A154B]/10 dark:bg-[#E01E5A]/10",
      connected: isSlackConnected,
      detail: data.settings.slackBotId
        ? `Bot ID: ${data.settings.slackBotId}`
        : isSlackConnected
          ? "OAuth Token Active"
          : "Not configured",
      type: "Slack Events API",
    },
    {
      id: "ai" as SettingsTabId,
      name: "AI Copilot & Router",
      channel: "ai",
      icon: <span className="text-base leading-none">✨</span>,
      bg: "bg-surface-well",
      connected: isAiConnected,
      detail: isAiConnected
        ? `${data.settings.ai?.provider?.toUpperCase()} • ${data.settings.ai?.model}`
        : "Not configured",
      type: "BYOK Multi-Router",
    },
  ];

  const connectedCount = providers.filter((p) => p.connected).length;
  const allAccounts = data.settings.accounts || [];

  return (
    <div className="space-y-6">
      {/* 1. All Providers Summary Card */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-elevated">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Connected Channels & Providers</h2>
            <p className="text-[12.5px] text-mute mt-0.5">
              Live connection status across all messaging platforms and AI routing services.
            </p>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium bg-surface-well text-body border border-hairline">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {connectedCount} of {providers.length} Active
            </span>
          </div>
        </div>

        {/* Provider Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-xl border border-hairline bg-canvas p-4 shadow-2xs hover:border-hairline-strong transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${p.bg}`}>
                        {p.icon}
                      </div>
                      <div>
                        <h3 className="text-[13px] font-semibold text-ink leading-tight">{p.name}</h3>
                        <span className="text-[10.5px] text-mute font-mono">{p.type}</span>
                      </div>
                    </div>

                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        p.connected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
                      }`}
                      title={p.connected ? "Connected & Active" : "Not configured"}
                    />
                  </div>

                  <p className="font-mono text-[11.5px] text-body truncate bg-surface-well/50 px-2.5 py-1.5 rounded-md border border-hairline">
                    {p.detail}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between">
                  <span
                    className={`text-[11px] font-medium ${
                      p.connected ? "text-emerald-600 dark:text-emerald-400" : "text-mute"
                    }`}
                  >
                    {p.connected ? "● Connected" : "○ Disconnected"}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateTab(p.id)}
                    className="h-7 px-2.5 text-[11.5px] cursor-pointer"
                  >
                    {p.connected ? "Configure" : "Connect"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. All Linked Accounts List (All Channels) */}
      {allAccounts.length > 0 && (
        <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-ink">
                All Connected Accounts ({allAccounts.length})
              </h3>
              <p className="text-[12px] text-mute mt-0.5">
                Unified directory of all external social handles, pages, and platform identifiers.
              </p>
            </div>
          </div>

          <div className="divide-y divide-hairline bg-canvas">
            {allAccounts.map((acc) => (
              <AccountRow
                key={acc.id}
                account={acc}
                onDisconnect={() => onDisconnectAccount(acc.id)}
                isBusy={busy === `disconnect-${acc.id}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
