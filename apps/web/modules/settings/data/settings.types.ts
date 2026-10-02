import type { SettingsPayload, ConnectedAccount, Channel } from "@/core/types";

export type SettingsTabId = "whatsapp" | "meta" | "telegram" | "discord" | "webhooks";

export interface ChannelStatusResult {
  ok: boolean;
  detail: string;
}

export type { SettingsPayload, ConnectedAccount, Channel };
