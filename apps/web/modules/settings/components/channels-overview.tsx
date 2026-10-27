"use client";

import { useState, useMemo } from "react";
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

type ChannelCategory = "all" | "social" | "bots" | "ai";

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
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory>("all");
  const [accountSearch, setAccountSearch] = useState("");

  const isAiConnected = Boolean(data.settings.ai?.configured);

  const providers = useMemo(
    () => [
      {
        id: "whatsapp" as SettingsTabId,
        name: "WhatsApp Cloud API",
        category: "social" as const,
        channel: "whatsapp" as const,
        icon: <ChannelIcon channel="whatsapp" className="h-5 w-5 text-whatsapp" />,
        bg: "bg-whatsapp/10",
        borderAccent: "border-l-whatsapp",
        connected: isWhatsAppConnected,
        detail: data.settings.waPhoneNumberId
          ? `Phone ID: ${data.settings.waPhoneNumberId}`
          : "Not configured",
        type: "Meta Cloud API",
        protocol: "Inbound Webhook",
        description: "Official WhatsApp Business Platform for high-volume customer chats & templates.",
      },
      {
        id: "meta" as SettingsTabId,
        name: "Facebook & Instagram",
        category: "social" as const,
        channel: "messenger" as const,
        icon: <ChannelIcon channel="messenger" className="h-5 w-5 text-messenger" />,
        bg: "bg-messenger/10",
        borderAccent: "border-l-messenger",
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
        type: "Meta Graph API v22.0",
        protocol: "OAuth 2.0 PKCE",
        description: "Unified inbox for Facebook Page messaging and Instagram Direct chats.",
      },
      {
        id: "telegram" as SettingsTabId,
        name: "Telegram Bot",
        category: "bots" as const,
        channel: "telegram" as const,
        icon: <ChannelIcon channel="telegram" className="h-5 w-5 text-sky-500" />,
        bg: "bg-sky-500/10",
        borderAccent: "border-l-sky-500",
        connected: isTelegramConnected,
        detail: data.settings.telegramBotId
          ? `Bot ID: ${data.settings.telegramBotId}`
          : isTelegramConnected
            ? "Bot Token Saved"
            : "Not configured",
        type: "Telegram Bot API",
        protocol: "Webhook & Secret Token",
        description: "Direct customer messaging and community channel broadcasts via BotFather.",
      },
      {
        id: "discord" as SettingsTabId,
        name: "Discord Bot",
        category: "bots" as const,
        channel: "discord" as const,
        icon: <ChannelIcon channel="discord" className="h-5 w-5 text-[#5865F2]" />,
        bg: "bg-[#5865F2]/10",
        borderAccent: "border-l-[#5865F2]",
        connected: isDiscordConnected,
        detail: isDiscordConnected ? "Bot & Slash Commands linked" : "Not configured",
        type: "Discord Gateway",
        protocol: "Ed25519 Signed REST",
        description: "Guild channel messaging and interactive /connectme slash command dispatch.",
      },
      {
        id: "slack" as SettingsTabId,
        name: "Slack Workspace",
        category: "bots" as const,
        channel: "slack" as const,
        icon: (
          <ChannelIcon
            channel="slack"
            className="h-5 w-5 text-[#4A154B] dark:text-[#E01E5A]"
          />
        ),
        bg: "bg-[#4A154B]/10 dark:bg-[#E01E5A]/10",
        borderAccent: "border-l-[#4A154B] dark:border-l-[#E01E5A]",
        connected: isSlackConnected,
        detail: data.settings.slackBotId
          ? `Bot ID: ${data.settings.slackBotId}`
          : isSlackConnected
            ? "OAuth Token Active"
            : "Not configured",
        type: "Slack Events API",
        protocol: "HMAC Signed Events",
        description: "Internal team communication, channel mirroring, and ticket sync.",
      },
      {
        id: "ai" as SettingsTabId,
        name: "AI Copilot & BYOK",
        category: "ai" as const,
        channel: "ai" as const,
        icon: <span className="text-base leading-none">✨</span>,
        bg: "bg-surface-well",
        borderAccent: "border-l-indigo-500",
        connected: isAiConnected,
        detail: isAiConnected
          ? `${data.settings.ai?.provider?.toUpperCase()} • ${data.settings.ai?.model}`
          : "Not configured",
        type: "Multi-Provider Router",
        protocol: "BYOK Custom Key",
        description: "Automated agent drafts, message summarization, and smart replies.",
      },
    ],
    [
      data.settings.accounts,
      data.settings.ai,
      data.settings.slackBotId,
      data.settings.telegramBotId,
      data.settings.waPhoneNumberId,
      isAiConnected,
      isDiscordConnected,
      isMetaConnected,
      isSlackConnected,
      isTelegramConnected,
      isWhatsAppConnected,
    ],
  );

  const connectedCount = providers.filter((p) => p.connected).length;
  const allAccounts = data.settings.accounts || [];

  const filteredProviders = useMemo(() => {
    if (selectedCategory === "all") return providers;
    return providers.filter((p) => p.category === selectedCategory);
  }, [providers, selectedCategory]);

  const filteredAccounts = useMemo(() => {
    if (!accountSearch.trim()) return allAccounts;
    const q = accountSearch.toLowerCase();
    return allAccounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.channel.toLowerCase().includes(q) ||
        a.externalId.toLowerCase().includes(q),
    );
  }, [allAccounts, accountSearch]);

  return (
    <div className="space-y-8">
      {/* 1. Executive Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-hairline bg-canvas-elevated p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-mute">
            <span className="font-mono text-[11px] uppercase tracking-wider">Connected Channels</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-ink">
            {connectedCount} <span className="text-sm font-normal text-mute">/ {providers.length}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-well overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(connectedCount / providers.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-hairline bg-canvas-elevated p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-mute">
            <span className="font-mono text-[11px] uppercase tracking-wider">Active Handles & Pages</span>
            <span className="text-xs">📱</span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-ink">
            {allAccounts.length}
          </div>
          <p className="text-[11.5px] text-mute truncate">
            {allAccounts.length > 0 ? "Synced with inbox" : "No accounts linked"}
          </p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-hairline bg-canvas-elevated p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-mute">
            <span className="font-mono text-[11px] uppercase tracking-wider">AI Copilot</span>
            <span className="text-xs">✨</span>
          </div>
          <div className="text-sm font-bold truncate text-ink pt-1">
            {isAiConnected
              ? `${data.settings.ai?.provider?.toUpperCase()}`
              : "Unconfigured"}
          </div>
          <p className="text-[11.5px] text-mute truncate font-mono">
            {isAiConnected ? data.settings.ai?.model : "BYOK Router"}
          </p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-hairline bg-canvas-elevated p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-mute">
            <span className="font-mono text-[11px] uppercase tracking-wider">Inbound Gateway</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
          </div>
          <div className="text-sm font-bold truncate text-ink pt-1">
            Operational
          </div>
          <p className="text-[11.5px] text-mute truncate font-mono">
            Zero-drop message queue
          </p>
        </div>
      </div>

      {/* 2. Channels Directory Card */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-2xs overflow-hidden">
        {/* Header with Category Filter */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-canvas-elevated">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Channel Hub</h2>
            <p className="text-[12.5px] text-mute mt-0.5">
              Live status and credential configuration for your customer communication pipelines.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center rounded-lg border border-hairline bg-surface-well/50 p-1 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-canvas text-ink font-semibold shadow-2xs"
                  : "text-mute hover:text-ink"
              }`}
            >
              All ({providers.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("social")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                selectedCategory === "social"
                  ? "bg-canvas text-ink font-semibold shadow-2xs"
                  : "text-mute hover:text-ink"
              }`}
            >
              Social
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("bots")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                selectedCategory === "bots"
                  ? "bg-canvas text-ink font-semibold shadow-2xs"
                  : "text-mute hover:text-ink"
              }`}
            >
              Bots & Chat
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory("ai")}
              className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                selectedCategory === "ai"
                  ? "bg-canvas text-ink font-semibold shadow-2xs"
                  : "text-mute hover:text-ink"
              }`}
            >
              AI
            </button>
          </div>
        </div>

        {/* Providers Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map((p) => (
              <div
                key={p.id}
                className="group flex flex-col justify-between rounded-xl border border-hairline bg-canvas p-5 shadow-2xs hover:border-hairline-strong transition-all duration-200"
              >
                <div className="space-y-3.5">
                  {/* Top Bar with Icon & Status Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs ${p.bg}`}>
                        {p.icon}
                      </div>
                      <div>
                        <h3 className="text-[14px] font-semibold text-ink group-hover:text-ink transition-colors">
                          {p.name}
                        </h3>
                        <span className="text-[11px] text-mute font-mono">
                          {p.type}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium ${
                        p.connected
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-surface-well text-mute border border-hairline"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          p.connected ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-neutral-400"
                        }`}
                      />
                      {p.connected ? "Active" : "Not Set"}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[12px] text-mute leading-relaxed line-clamp-2">
                    {p.description}
                  </p>

                  {/* Identifier & Protocol Pills */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between rounded-lg border border-hairline bg-surface-well/50 px-2.5 py-1.5 text-[11px] font-mono text-body">
                      <span className="truncate">{p.detail}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10.5px] text-mute font-mono px-1">
                      <span>Protocol:</span>
                      <span className="text-body">{p.protocol}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3.5 border-t border-hairline flex items-center justify-between">
                  <span
                    className={`text-[11.5px] font-medium ${
                      p.connected ? "text-emerald-600 dark:text-emerald-400" : "text-mute"
                    }`}
                  >
                    {p.connected ? "● Connected" : "○ Disconnected"}
                  </span>

                  <Button
                    type="button"
                    variant={p.connected ? "outline" : "primary"}
                    size="sm"
                    onClick={() => onNavigateTab(p.id)}
                    className="h-7 px-3 text-[12px] font-medium cursor-pointer"
                  >
                    {p.connected ? "Configure →" : "Connect +"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. All Linked Accounts List */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-ink">
                Connected Accounts Directory
              </h3>
              <span className="rounded-full bg-surface-well px-2 py-0.5 font-mono text-[11px] text-body border border-hairline">
                {allAccounts.length}
              </span>
            </div>
            <p className="text-[12px] text-mute mt-0.5">
              Individual Facebook Pages, Instagram business profiles, and channel endpoints linked to your tenant.
            </p>
          </div>

          {allAccounts.length > 0 && (
            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                placeholder="Filter accounts..."
                className="h-7 w-full rounded-md border border-hairline bg-canvas px-2.5 pl-7 text-[12px] text-ink placeholder:text-mute focus:outline-none"
              />
              <svg
                className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-mute"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
        </div>

        {allAccounts.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-well border border-hairline text-mute">
              <svg className="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-[14px] font-semibold text-ink">No External Accounts Linked</h4>
              <p className="text-[12px] text-mute max-w-sm mx-auto">
                Connect your Meta Pages, Instagram business accounts, or Slack workspaces to start managing conversations.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab("meta")}
              className="h-8 px-3.5 text-[12px] cursor-pointer"
            >
              Connect Meta & Instagram →
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-hairline bg-canvas">
            {filteredAccounts.map((acc) => (
              <AccountRow
                key={acc.id}
                account={acc}
                onDisconnect={() => onDisconnectAccount(acc.id)}
                isBusy={busy === `disconnect-${acc.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
