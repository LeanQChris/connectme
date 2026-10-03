"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "../api/settings.api";
import type { SettingsPayload } from "@/core/types";
import type { SettingsTabId } from "../data/settings.types";

export function useSettingsForm(initial: SettingsPayload) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialError = searchParams.get("error")
    ? decodeURIComponent(searchParams.get("error")!)
    : null;
  const connectedParam = searchParams.get("connected");
  const countParam = searchParams.get("count");
  const initialSuccess =
    connectedParam === "meta"
      ? countParam
        ? `Successfully connected ${countParam} accounts via Meta!`
        : "Successfully connected Facebook & Instagram!"
      : null;

  const [activeTab, setActiveTab] = useState<SettingsTabId>("whatsapp");
  const [globalError, setGlobalError] = useState<string | null>(initialError);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(initialSuccess);
  const [busy, setBusy] = useState<string | null>(null);

  const [channelStatus, setChannelStatus] = useState<
    Record<string, { ok: boolean; detail: string }>
  >({});

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const toggleSecret = (fieldKey: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const [whatsappForm, setWhatsappForm] = useState({
    waPhoneNumberId: "",
    waAccessToken: "",
    waAppId: "",
    waAppSecret: "",
  });

  const [metaForm, setMetaForm] = useState({
    pageAccessToken: "",
    metaAppSecret: "",
    webhookVerifyToken: "",
  });

  const [telegramForm, setTelegramForm] = useState({
    telegramBotToken: "",
    telegramChannelId: "",
  });

  const [discordForm, setDiscordForm] = useState({
    discordBotToken: "",
    discordPublicKey: "",
    discordChannelId: "",
  });

  const [showManualMeta, setShowManualMeta] = useState(false);

  // Settings React Query
  const { data = initial } = useQuery<SettingsPayload>({
    queryKey: ["settings"],
    queryFn: () => settingsApi.getSettings(),
    initialData: initial,
  });

  // Save Channel Mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      patch,
    }: {
      patch: Record<string, string>;
      channelKey: string;
      successMsg: string;
      onSuccessReset?: () => void;
    }) => {
      return settingsApi.saveSettings(patch);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      variables.onSuccessReset?.();
      setChannelStatus((prev) => ({
        ...prev,
        [variables.channelKey]: { ok: true, detail: variables.successMsg },
      }));
    },
    onError: (err, variables) => {
      const msg = err instanceof Error ? err.message : "Failed to save settings.";
      setChannelStatus((prev) => ({
        ...prev,
        [variables.channelKey]: { ok: false, detail: msg },
      }));
    },
    onSettled: () => {
      setBusy(null);
    },
  });

  const saveChannel = (
    patch: Record<string, string>,
    channelKey: string,
    successMsg: string,
    onSuccessReset?: () => void,
  ) => {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v.trim()) cleaned[k] = v.trim();
    }

    if (Object.keys(cleaned).length === 0) {
      setChannelStatus((prev) => ({
        ...prev,
        [channelKey]: { ok: false, detail: "Please enter at least one field to save." },
      }));
      return;
    }

    setBusy(`save-${channelKey}`);
    setGlobalError(null);
    setGlobalSuccess(null);

    saveMutation.mutate({ patch: cleaned, channelKey, successMsg, onSuccessReset });
  };

  // Verify Channel Mutation
  const verifyMutation = useMutation({
    mutationFn: (channel: string) => settingsApi.verifyChannel(channel),
    onSuccess: (result, channel) => {
      setChannelStatus((prev) => ({
        ...prev,
        [channel]: {
          ok: Boolean(result.ok),
          detail: String(result.detail ?? (result.ok ? "Verification successful" : "Verification failed")),
        },
      }));
      if (result.pageId) {
        void queryClient.invalidateQueries({ queryKey: ["settings"] });
      }
    },
    onError: (_, channel) => {
      setChannelStatus((prev) => ({
        ...prev,
        [channel]: { ok: false, detail: "Connection test failed. Please verify credentials." },
      }));
    },
    onSettled: () => {
      setBusy(null);
    },
  });

  const verifyChannel = (channel: "whatsapp" | "page" | "telegram" | "discord") => {
    setBusy(`verify-${channel}`);
    setChannelStatus((prev) => ({ ...prev, [channel]: { ok: true, detail: "Verifying…" } }));
    verifyMutation.mutate(channel);
  };

  // Disconnect Meta Account Mutation
  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) => settingsApi.disconnectMetaAccount(accountId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      setGlobalSuccess("Account disconnected successfully.");
    },
    onError: (err) => {
      setGlobalError(err instanceof Error ? err.message : "Failed to disconnect account.");
    },
    onSettled: () => {
      setBusy(null);
    },
  });

  const disconnectAccount = (accountId: string) => {
    setBusy(`disconnect-${accountId}`);
    setGlobalError(null);
    setGlobalSuccess(null);
    disconnectMutation.mutate(accountId);
  };

  // Setup Telegram Webhook Mutation
  const telegramSetupMutation = useMutation({
    mutationFn: (url: string) => settingsApi.setupTelegram(url),
    onSuccess: (body) => {
      setChannelStatus((prev) => ({
        ...prev,
        "telegram-webhook": { ok: true, detail: `✓ Webhook active: ${body.webhookUrl ?? ""}` },
      }));
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err) => {
      setChannelStatus((prev) => ({
        ...prev,
        "telegram-webhook": {
          ok: false,
          detail: err instanceof Error ? err.message : "Failed to register webhook.",
        },
      }));
    },
    onSettled: () => {
      setBusy(null);
    },
  });

  const registerTelegram = () => {
    setBusy("telegram-webhook");
    setChannelStatus((prev) => ({
      ...prev,
      "telegram-webhook": { ok: true, detail: "Registering webhook with Telegram…" },
    }));
    telegramSetupMutation.mutate(window.location.origin);
  };

  // Setup Discord Slash Command Mutation
  const discordSetupMutation = useMutation({
    mutationFn: () => settingsApi.setupDiscord(),
    onSuccess: () => {
      setChannelStatus((prev) => ({
        ...prev,
        "discord-slash": { ok: true, detail: "✓ /connectme command registered successfully!" },
      }));
    },
    onError: (err) => {
      setChannelStatus((prev) => ({
        ...prev,
        "discord-slash": {
          ok: false,
          detail: err instanceof Error ? err.message : "Failed to register slash command.",
        },
      }));
    },
    onSettled: () => {
      setBusy(null);
    },
  });

  const registerDiscord = () => {
    setBusy("discord-slash");
    setChannelStatus((prev) => ({
      ...prev,
      "discord-slash": { ok: true, detail: "Registering slash command with Discord…" },
    }));
    discordSetupMutation.mutate();
  };

  const isWhatsAppConnected = Boolean(data.settings.connected.whatsapp);
  const isMetaConnected = Boolean(
    data.settings.connected.messenger ||
    data.settings.connected.instagram ||
    (data.settings.accounts && data.settings.accounts.length > 0)
  );
  const isTelegramConnected = Boolean(data.settings.connected.telegram);
  const isDiscordConnected = Boolean(data.settings.connected.discord);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const metaUrl = data.webhookUrls.meta.startsWith("http")
    ? data.webhookUrls.meta
    : `${origin}${data.webhookUrls.meta}`;

  return {
    data,
    activeTab,
    setActiveTab,
    globalError,
    setGlobalError,
    globalSuccess,
    setGlobalSuccess,
    busy,
    channelStatus,
    visibleSecrets,
    toggleSecret,
    whatsappForm,
    setWhatsappForm,
    metaForm,
    setMetaForm,
    telegramForm,
    setTelegramForm,
    discordForm,
    setDiscordForm,
    showManualMeta,
    setShowManualMeta,
    saveChannel,
    verifyChannel,
    disconnectAccount,
    registerTelegram,
    registerDiscord,
    isWhatsAppConnected,
    isMetaConnected,
    isTelegramConnected,
    isDiscordConnected,
    metaUrl,
  };
}
