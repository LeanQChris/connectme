import { auth } from "@clerk/nextjs/server";
import { SettingsModule } from "@/modules/settings";
import { envConfig } from "@/core/config/env.config";
import type { SettingsPayload } from "@/core/types";

export const metadata = {
  title: "Settings · ConnectMe",
};

const defaultSettingsPayload: SettingsPayload = {
  settings: {
    accounts: [],
    connected: {
      whatsapp: false,
      messenger: false,
      instagram: false,
      telegram: false,
      discord: false,
    },
    pageId: null,
    pageName: null,
    instagramUsername: null,
    telegramBotId: null,
    discordBotId: null,
    updatedAt: null,
    webhookVerifyToken: "connectme_verify_token",
    waPhoneNumberId: null,
    waAppId: null,
  },
  oauth: {
    metaConfigured: false,
  },
  webhookUrls: {
    meta: `${envConfig.apiUrl}/api/webhook/meta`,
    telegram: `${envConfig.apiUrl}/api/webhook/telegram`,
    discord: `${envConfig.apiUrl}/api/webhook/discord`,
  },
};

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    return <div className="min-h-[100dvh] bg-canvas" />;
  }

  let initial: SettingsPayload = defaultSettingsPayload;
  try {
    const res = await fetch(`${envConfig.apiUrl}/api/settings`, {
      headers: { "x-tenant-id": userId },
      cache: "no-store",
    });

    if (res.ok) {
      initial = (await res.json()) as SettingsPayload;
    }
  } catch (err) {
    console.warn("[settings] could not fetch initial settings from API:", err);
  }

  return <SettingsModule initial={initial} />;
}
