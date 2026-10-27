"use client";

import { useState } from "react";
import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyCard } from "./copy-card";
import { WhatsAppTemplateManager } from "./whatsapp-template-manager";
import type { SettingsPayload } from "@/core/types";

interface WhatsappSettingsProps {
  data: SettingsPayload;
  isWhatsAppConnected: boolean;
  whatsappForm: {
    waPhoneNumberId: string;
    waAccessToken: string;
    waAppId: string;
    waAppSecret: string;
  };
  setWhatsappForm: React.Dispatch<
    React.SetStateAction<{
      waPhoneNumberId: string;
      waAccessToken: string;
      waAppId: string;
      waAppSecret: string;
    }>
  >;
  visibleSecrets: Record<string, boolean>;
  toggleSecret: (key: string) => void;
  busy: string | null;
  channelStatus: Record<string, { ok: boolean; detail: string }>;
  onSave: () => void;
  onVerify: () => void;
}

export function WhatsappSettings({
  data,
  isWhatsAppConnected,
  whatsappForm,
  setWhatsappForm,
  visibleSecrets,
  toggleSecret,
  busy,
  channelStatus,
  onSave,
  onVerify,
}: WhatsappSettingsProps) {
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. Main Configuration Card */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-canvas-elevated">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-whatsapp/10 text-whatsapp shadow-2xs">
              <ChannelIcon channel="whatsapp" className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink">WhatsApp Cloud API</h2>
                <span className="rounded bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] text-mute border border-hairline">
                  Meta Cloud
                </span>
              </div>
              <p className="text-[12.5px] text-mute mt-0.5">
                Official Cloud API for business messaging, two-way conversations, and rich media.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-mute hover:text-ink transition-colors"
            >
              Meta Developer Portal ↗
            </a>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isWhatsAppConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isWhatsAppConnected ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-neutral-400"
                }`}
              />
              {isWhatsAppConnected ? "Connected" : "Unconfigured"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Active Configuration Banner */}
          {data.settings.waPhoneNumberId && (
            <div className="rounded-xl border border-hairline bg-surface-well/40 p-4 flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-body">
                  Active Phone Number ID:{" "}
                  <strong className="font-mono text-ink font-semibold">
                    {data.settings.waPhoneNumberId}
                  </strong>
                </span>
              </div>
              {data.settings.waAppId && (
                <span className="text-mute font-mono text-[11.5px]">
                  App ID: <span className="text-body">{data.settings.waAppId}</span>
                </span>
              )}
            </div>
          )}

          {/* Quick Setup Instructions Collapsible */}
          <div className="rounded-xl border border-hairline bg-surface-well/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="w-full px-4 py-3 text-left flex items-center justify-between text-[12.5px] font-medium text-ink hover:bg-surface-well/40 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">📘</span>
                <span>How to get your WhatsApp Cloud API credentials</span>
              </span>
              <span className="text-mute font-mono text-xs">
                {showSetupGuide ? "Hide Guide ↑" : "Show Guide ↓"}
              </span>
            </button>

            {showSetupGuide && (
              <div className="px-4 pb-4 pt-1 border-t border-hairline space-y-2 text-[12px] text-mute">
                <p>1. Open <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-ink underline">Meta Developer Apps</a> and create or select a Business App.</p>
                <p>2. Add the <strong>WhatsApp</strong> product, navigate to <strong>API Setup</strong>, and copy your <strong>Phone number ID</strong>.</p>
                <p>3. In Business Manager &rarr; System Users, generate a permanent token with <code className="font-mono text-ink">whatsapp_business_messaging</code> and <code className="font-mono text-ink">whatsapp_business_management</code>.</p>
                <p>4. In WhatsApp &rarr; Configuration, set the Webhook Callback URL to your ConnectMe webhook below and subscribe to <code className="font-mono text-ink">messages</code>.</p>
              </div>
            )}
          </div>

          {/* Form Inputs Grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-ink">
                Phone Number ID <span className="text-error">*</span>
              </label>
              <Input
                type="text"
                value={whatsappForm.waPhoneNumberId}
                onChange={(e) =>
                  setWhatsappForm((prev) => ({ ...prev, waPhoneNumberId: e.target.value }))
                }
                placeholder={data.settings.waPhoneNumberId || "e.g. 104829104829104"}
                className="h-9 font-mono text-[12.5px]"
              />
              <span className="block text-[11px] text-mute">
                From Meta Developer Portal &rarr; WhatsApp &rarr; API Setup
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-ink">
                Permanent Access Token <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.waAccessToken ? "text" : "password"}
                  value={whatsappForm.waAccessToken}
                  onChange={(e) =>
                    setWhatsappForm((prev) => ({ ...prev, waAccessToken: e.target.value }))
                  }
                  placeholder={
                    isWhatsAppConnected
                      ? "••••••••••••••••••••••••••••••••  (Saved securely)"
                      : "EAAG..."
                  }
                  className="h-9 pr-14 font-mono text-[12.5px]"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("waAccessToken")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mute hover:text-ink cursor-pointer px-1.5 py-0.5 rounded"
                >
                  {visibleSecrets.waAccessToken ? "Hide" : "Show"}
                </button>
              </div>
              <span className="block text-[11px] text-mute">
                System User Token with <code className="font-mono text-ink">whatsapp_business_messaging</code>
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-ink">
                Meta App ID <span className="text-mute font-normal text-[11px]">(Optional)</span>
              </label>
              <Input
                type="text"
                value={whatsappForm.waAppId}
                onChange={(e) =>
                  setWhatsappForm((prev) => ({ ...prev, waAppId: e.target.value }))
                }
                placeholder={data.settings.waAppId || "e.g. 592019482910"}
                className="h-9 font-mono text-[12.5px]"
              />
              <span className="block text-[11px] text-mute">
                Used to verify webhook payloads and proxy media uploads
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-semibold text-ink">
                Meta App Secret <span className="text-mute font-normal text-[11px]">(Optional)</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.waAppSecret ? "text" : "password"}
                  value={whatsappForm.waAppSecret}
                  onChange={(e) =>
                    setWhatsappForm((prev) => ({ ...prev, waAppSecret: e.target.value }))
                  }
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="h-9 pr-14 font-mono text-[12.5px]"
                />
                <button
                  type="button"
                  onClick={() => toggleSecret("waAppSecret")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-mute hover:text-ink cursor-pointer px-1.5 py-0.5 rounded"
                >
                  {visibleSecrets.waAppSecret ? "Hide" : "Show"}
                </button>
              </div>
              <span className="block text-[11px] text-mute">
                Used for HMAC SHA-256 webhook signature validation
              </span>
            </div>
          </div>

          {/* Inline Webhook Helper */}
          {data.webhookUrls.meta && (
            <div className="pt-2">
              <CopyCard
                label="Meta Webhook Callback URL for WhatsApp"
                value={data.webhookUrls.meta}
                hint="In Meta App Dashboard &rarr; WhatsApp &rarr; Configuration, set this Callback URL and subscribe to the 'messages' field."
                badge="Inbound Webhook"
              />
            </div>
          )}

          {/* Action Toolbar & Feedback */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-hairline">
            <div className="flex items-center gap-2">
              {channelStatus.whatsapp && (
                <span
                  className={`inline-flex items-center gap-1.5 font-mono text-[11.5px] px-2.5 py-1 rounded-md ${
                    channelStatus.whatsapp.ok
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-error border border-red-500/20"
                  }`}
                >
                  <span>{channelStatus.whatsapp.ok ? "✓" : "✕"}</span>
                  <span>{channelStatus.whatsapp.detail}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onVerify}
                disabled={busy !== null || !isWhatsAppConnected}
                className="h-8 px-3 text-[12px] font-medium cursor-pointer"
              >
                {busy === "verify-whatsapp" ? "Verifying…" : "Test API Connection"}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={onSave}
                disabled={busy !== null}
                className="h-8 px-4 text-[12px] font-semibold cursor-pointer"
              >
                {busy === "save-whatsapp" ? "Saving…" : "Save Credentials"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. WhatsApp Official HSM Template Manager */}
      <WhatsAppTemplateManager />
    </div>
  );
}
