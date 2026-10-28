"use client";

import { memo } from "react";
import { ChannelIcon } from "@/components/ui/channel-badge";
import type { SettingsTabId } from "../data/settings.types";

interface SettingsTabsProps {
  activeTab: SettingsTabId;
  onSelectTab: (tab: SettingsTabId) => void;
  isWhatsAppConnected: boolean;
  isMetaConnected: boolean;
  isTelegramConnected: boolean;
  isDiscordConnected: boolean;
  isSlackConnected: boolean;
  isAiConnected?: boolean;
  metaAccountsCount?: number;
}

interface NavItem {
  id: SettingsTabId;
  label: string;
  icon: React.ReactNode;
  connected?: boolean;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const SettingsTabs = memo(function SettingsTabs({
  activeTab,
  onSelectTab,
  isWhatsAppConnected,
  isMetaConnected,
  isTelegramConnected,
  isDiscordConnected,
  isSlackConnected,
  isAiConnected,
  metaAccountsCount = 0,
}: SettingsTabsProps) {
  const totalChannelsConnected = [
    isWhatsAppConnected,
    isMetaConnected,
    isTelegramConnected,
    isDiscordConnected,
    isSlackConnected,
  ].filter(Boolean).length;

  const sections: NavSection[] = [
    {
      title: "Navigation",
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: (
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          ),
          badge: `${totalChannelsConnected}/5 active`,
        },
      ],
    },
    {
      title: "Channels",
      items: [
        {
          id: "whatsapp",
          label: "WhatsApp Cloud",
          icon: <ChannelIcon channel="whatsapp" className="h-4 w-4 text-whatsapp" />,
          connected: isWhatsAppConnected,
        },
        {
          id: "meta",
          label: "Facebook & Instagram",
          icon: <ChannelIcon channel="messenger" className="h-4 w-4 text-messenger" />,
          connected: isMetaConnected,
          badge: metaAccountsCount > 0 ? `${metaAccountsCount} accounts` : undefined,
        },
        {
          id: "telegram",
          label: "Telegram Bot",
          icon: <ChannelIcon channel="telegram" className="h-4 w-4 text-sky-500" />,
          connected: isTelegramConnected,
        },
        {
          id: "discord",
          label: "Discord Bot",
          icon: <ChannelIcon channel="discord" className="h-4 w-4 text-[#5865F2]" />,
          connected: isDiscordConnected,
        },
        {
          id: "slack",
          label: "Slack Workspace",
          icon: <ChannelIcon channel="slack" className="h-4 w-4 text-[#4A154B] dark:text-[#E01E5A]" />,
          connected: isSlackConnected,
        },
      ],
    },
    {
      title: "Intelligence",
      items: [
        {
          id: "ai",
          label: "AI Copilot & Router",
          icon: (
            <span className="flex h-4 w-4 items-center justify-center text-xs">
              ✨
            </span>
          ),
          connected: isAiConnected,
          badge: isAiConnected ? "Configured" : undefined,
        },
      ],
    },
    {
      title: "Workspace",
      items: [
        {
          id: "team",
          label: "Team & RBAC",
          icon: (
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          id: "webhooks",
          label: "Webhooks & Endpoints",
          icon: (
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          ),
        },
        {
          id: "notifications",
          label: "Notifications & Audio",
          icon: (
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          ),
        },
      ],
    },
  ];

  const allItems = sections.flatMap((sec) => sec.items);

  return (
    <div className="w-full">
      {/* Mobile Horizontal Pill Strip (< md screens) */}
      <div className="mb-6 flex md:hidden overflow-x-auto border-b border-hairline pb-2.5 no-scrollbar gap-1.5 -mx-4 px-4">
        {allItems.map((item) => {
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
                isSelected
                  ? "bg-surface-well text-ink font-semibold border border-hairline shadow-2xs"
                  : "text-mute hover:text-ink hover:bg-surface-well/50 border border-transparent"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
              {typeof item.connected === "boolean" && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    item.connected ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-neutral-300 dark:bg-neutral-700"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop Categorized High-Density Sidebar (>= md screens) */}
      <nav className="hidden w-full flex-col gap-5 md:flex">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="px-2 text-[11px] font-semibold text-mute">
              {section.title}
            </h3>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`group relative flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-colors ${
                      isSelected
                        ? "border-emerald-500/20 bg-emerald-500/10 font-medium text-ink"
                        : "border-transparent text-body hover:bg-surface-well/70 hover:text-ink"
                    }`}
                  >
                    {/* Active accent pill on left border */}
                    {isSelected && (
                      <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r-full bg-emerald-600 dark:bg-emerald-400" />
                    )}

                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-md transition-colors ${
                          isSelected
                            ? "text-ink"
                            : "text-mute group-hover:text-ink"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {item.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {item.badge && (
                        <span className="rounded bg-surface-well/80 px-1.5 py-0.5 font-mono text-[9.5px] text-mute border border-hairline">
                          {item.badge}
                        </span>
                      )}

                      {typeof item.connected === "boolean" && (
                        <span
                          title={item.connected ? "Connected & Active" : "Not configured"}
                          className={`h-2 w-2 rounded-full transition-colors ${
                            item.connected
                              ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                              : "bg-neutral-300 dark:bg-neutral-700"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
});
