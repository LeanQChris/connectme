import type { SettingsPayload, ConnectedAccount, Channel } from "@/core/types";

export type SettingsTabId =
  | "overview"
  | "whatsapp"
  | "meta"
  | "telegram"
  | "discord"
  | "slack"
  | "notifications"
  | "webhooks"
  | "ai"
  | "team";

export interface ChannelStatusResult {
  ok: boolean;
  detail: string;
}

export type { SettingsPayload, ConnectedAccount, Channel };
