"use client";

import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SettingsPayload } from "@/core/types";

import { WhatsAppTemplateManager } from "./whatsapp-template-manager";

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
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-hairline">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-whatsapp/10 text-whatsapp">
              <ChannelIcon channel="whatsapp" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">WhatsApp Cloud API</h2>
              <p className="text-[12.5px] text-body">
                Official Meta Cloud API for customer conversations and media attachments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium ${
                isWhatsAppConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isWhatsAppConnected ? "bg-emerald-500" : "bg-neutral-400"
                }`}
              />
              {isWhatsAppConnected ? "Connected" : "Not configured"}
            </span>
          </div>
        </div>

        {/* Currently Active Configuration Badge */}
        {data.settings.waPhoneNumberId && (
          <div className="mt-4 rounded-lg border border-hairline bg-surface-well/50 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <span className="text-body">
              Active Phone Number ID: <strong className="font-mono text-ink">{data.settings.waPhoneNumberId}</strong>
            </span>
            {data.settings.waAppId && (
              <span className="text-mute font-mono text-[11px]">
                Meta App ID: {data.settings.waAppId}
              </span>
            )}
          </div>
        )}

        {/* WhatsApp Form Inputs (Strictly Isolated State) */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Phone Number ID */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">
              Phone Number ID <span className="text-error">*</span>
            </label>
            <Input
              type="text"
              value={whatsappForm.waPhoneNumberId}
              onChange={(e) =>
                setWhatsappForm((prev) => ({ ...prev, waPhoneNumberId: e.target.value }))
              }
              placeholder={data.settings.waPhoneNumberId || "e.g. 104829104829104"}
            />
            <span className="text-[11px] text-mute">
              From Meta Developer Portal → WhatsApp → API Setup
            </span>
          </div>

          {/* Access Token */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">
              Permanent Access Token <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Input
                type={visibleSecrets.waAccessToken ? "text" : "password"}
                value={whatsappForm.waAccessToken}
                onChange={(e) =>
                  setWhatsappForm((prev) => ({ ...prev, waAccessToken: e.target.value }))
                }
                placeholder={isWhatsAppConnected ? "••••••••••••  (Active & Encrypted)" : "EAAG..."}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => toggleSecret("waAccessToken")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
                title={visibleSecrets.waAccessToken ? "Hide" : "Show"}
              >
                {visibleSecrets.waAccessToken ? "Hide" : "Show"}
              </button>
            </div>
            <span className="text-[11px] text-mute">
              System User Token with <code className="font-mono">whatsapp_business_messaging</code>
            </span>
          </div>

          {/* Meta App ID (Optional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">
              Meta App ID <span className="text-mute font-normal">(Optional)</span>
            </label>
            <Input
              type="text"
              value={whatsappForm.waAppId}
              onChange={(e) =>
                setWhatsappForm((prev) => ({ ...prev, waAppId: e.target.value }))
              }
              placeholder={data.settings.waAppId || "e.g. 592019482910"}
            />
            <span className="text-[11px] text-mute">
              Used to address WhatsApp media uploads directly
            </span>
          </div>

          {/* WhatsApp App Secret */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-medium text-ink">
              WhatsApp App Secret <span className="text-mute font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Input
                type={visibleSecrets.waAppSecret ? "text" : "password"}
                value={whatsappForm.waAppSecret}
                onChange={(e) =>
                  setWhatsappForm((prev) => ({ ...prev, waAppSecret: e.target.value }))
                }
                placeholder="App secret for WhatsApp webhook HMAC"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => toggleSecret("waAppSecret")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
              >
                {visibleSecrets.waAppSecret ? "Hide" : "Show"}
              </button>
            </div>
            <span className="text-[11px] text-mute">
              Isolated secret for your WhatsApp developer app
            </span>
          </div>
        </div>

        {/* Action Buttons & Feedback */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-hairline">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={onSave}
              disabled={busy !== null}
            >
              {busy === "save-whatsapp" ? "Saving WhatsApp…" : "Save WhatsApp Settings"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onVerify}
              disabled={busy !== null}
            >
              {busy === "verify-whatsapp" ? "Testing…" : "Verify Connection"}
            </Button>
          </div>

          {channelStatus.whatsapp && (
            <div
              className={`text-[12.5px] font-medium ${
                channelStatus.whatsapp.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
              }`}
            >
              {channelStatus.whatsapp.detail}
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Message Template Manager Component */}
      <WhatsAppTemplateManager />

      {/* Quick Setup Guide Card */}
      <div className="rounded-xl border border-hairline bg-surface-well/40 p-4 text-[12.5px] text-body">
        <h3 className="font-semibold text-ink text-[13px] mb-1">Quick WhatsApp Setup Guide:</h3>
        <ol className="list-decimal pl-5 space-y-1 text-mute text-[12px]">
          <li>
            Visit{" "}
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noreferrer"
              className="text-ink underline"
            >
              Meta Developer Portal
            </a>{" "}
            and select your Business App.
          </li>
          <li>
            Under WhatsApp → API Setup, copy your <strong>Phone number ID</strong>.
          </li>
          <li>
            Generate a Permanent System User Token with{" "}
            <code className="font-mono text-ink">whatsapp_business_messaging</code> and{" "}
            <code className="font-mono text-ink">whatsapp_business_management</code>.
          </li>
          <li>
            Paste the values above and click Save. Copy the Webhook URL from the <em>Webhooks</em> tab into Meta.
          </li>
        </ol>
      </div>
    </div>
  );
}
