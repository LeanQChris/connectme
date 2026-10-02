import { httpClient } from "@/core/api/http-client";
import type { SettingsPayload } from "@/core/types";

export const settingsApi = {
  getSettings: () => {
    return httpClient<SettingsPayload>("/api/settings", { cache: "no-store" });
  },

  saveSettings: (secrets: Record<string, unknown>) => {
    return httpClient<SettingsPayload>("/api/settings", {
      method: "POST",
      body: JSON.stringify({ secrets }),
    });
  },

  verifyChannel: (channel: string) => {
    return httpClient<{ ok: boolean; detail: string; pageId?: string }>("/api/settings/verify", {
      method: "POST",
      body: JSON.stringify({ channel }),
    });
  },

  setupTelegram: (url: string) => {
    return httpClient<{ status?: string; result?: unknown; webhookUrl?: string }>(
      `/api/telegram/setup?url=${encodeURIComponent(url)}`,
      { cache: "no-store" },
    );
  },

  setupDiscord: () => {
    return httpClient<{ status: string; result: unknown }>("/api/discord/setup", {
      cache: "no-store",
    });
  },

  disconnectMetaAccount: (accountId: string) => {
    return httpClient<{ ok: boolean }>("/api/auth/meta/disconnect", {
      method: "POST",
      body: JSON.stringify({ accountId }),
    });
  },
};
