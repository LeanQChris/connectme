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
  isAiConnected?: boolean;
}

export const SettingsTabs = memo(function SettingsTabs({
  activeTab,
  onSelectTab,
  isWhatsAppConnected,
  isMetaConnected,
  isTelegramConnected,
  isDiscordConnected,
  isAiConnected,
}: SettingsTabsProps) {
  return (
    <div className="mb-6 flex overflow-x-auto border-b border-hairline no-scrollbar gap-1 sm:gap-2">
      <button
        type="button"
        onClick={() => onSelectTab("ai")}
        className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
          activeTab === "ai"
            ? "border-violet-500 text-violet-600 dark:text-violet-400 font-semibold"
            : "border-transparent text-mute hover:text-body"
        }`}
      >
        <span className="text-violet-500">✨</span>
        <span>AI Copilot & BYOK</span>
        <span
          className={`h-2 w-2 rounded-full ${
            isAiConnected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
          }`}
        />
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("whatsapp")}
        className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
          activeTab === "whatsapp"
            ? "border-ink text-ink font-semibold"
            : "border-transparent text-mute hover:text-body"
        }`}
      >
        <ChannelIcon channel="whatsapp" className="h-4 w-4 text-whatsapp" />
        <span>WhatsApp</span>
        <span
          className={`h-2 w-2 rounded-full ${
            isWhatsAppConnected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
          }`}
        />
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("meta")}
        className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
          activeTab === "meta"
            ? "border-ink text-ink font-semibold"
            : "border-transparent text-mute hover:text-body"
        }`}
      >
        <ChannelIcon channel="messenger" className="h-4 w-4 text-messenger" />
        <span>Facebook & Instagram</span>
        <span
          className={`h-2 w-2 rounded-full ${
            isMetaConnected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
          }`}
        />
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("telegram")}
        className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
          activeTab === "telegram"
            ? "border-ink text-ink font-semibold"
            : "border-transparent text-mute hover:text-body"
        }`}
      >
        <ChannelIcon channel="telegram" className="h-4 w-4 text-sky-500" />
        <span>Telegram</span>
        <span
          className={`h-2 w-2 rounded-full ${
            isTelegramConnected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
          }`}
        />
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("discord")}
        className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
          activeTab === "discord"
            ? "border-ink text-ink font-semibold"
            : "border-transparent text-mute hover:text-body"
        }`}
      >
        <ChannelIcon channel="discord" className="h-4 w-4 text-[#5865F2]" />
        <span>Discord</span>
        <span
          className={`h-2 w-2 rounded-full ${
            isDiscordConnected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
          }`}
        />
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("team")}
        className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
          activeTab === "team"
            ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold"
            : "border-transparent text-mute hover:text-body"
        }`}
      >
        <span className="text-indigo-500">👥</span>
        <span>Team & Roles</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("notifications")}
        className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
          activeTab === "notifications"
            ? "border-ink text-ink font-semibold"
            : "border-transparent text-mute hover:text-body"
        }`}
      >
        <svg className="h-4 w-4 text-emerald-400 stroke-current" fill="none" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <span>Notifications & PWA</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab("webhooks")}
        className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
          activeTab === "webhooks"
            ? "border-ink text-ink font-semibold"
            : "border-transparent text-mute hover:text-body"
        }`}
      >
        <svg className="h-4 w-4 text-mute stroke-current" fill="none" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        <span>Webhooks & URLs</span>
      </button>
    </div>
  );
});
