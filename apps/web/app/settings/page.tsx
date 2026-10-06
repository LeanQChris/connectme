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
      slack: false,
      widget: false,
      ai: false,
    },
    pageId: null,
    pageName: null,
    instagramUsername: null,
    telegramBotId: null,
    discordBotId: null,
    slackBotId: null,
    whatsappPhoneId: null,
    metaAppId: null,
    discordPublicKeyConfigured: false,
    ai: {
      configured: false,
      provider: "openai",
      model: "gpt-4o-mini",
      customBaseUrl: null,
      customSystemPrompt: null,
    },
    updatedAt: null,
    webhookVerifyToken: "",
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
    slack: `${envConfig.apiUrl}/api/webhook/slack`,
  },
};

export default async function SettingsPage() {
  const { userId, getToken } = await auth();

  if (!userId) {
    return <div className="min-h-[100dvh] bg-canvas" />;
  }

  let initial: SettingsPayload = defaultSettingsPayload;
  try {
    const token = await getToken();
    const res = await fetch(`${envConfig.apiUrl}/api/settings`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
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
