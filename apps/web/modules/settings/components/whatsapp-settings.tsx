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
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-whatsapp/10 text-whatsapp">
              <ChannelIcon channel="whatsapp" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">WhatsApp Cloud API</h2>
              <p className="text-[12.5px] text-mute mt-0.5">
                Official Meta Cloud API for customer conversations and media attachments.
              </p>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isWhatsAppConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isWhatsAppConnected ? "bg-emerald-500" : "bg-neutral-400"}`} />
              {isWhatsAppConnected ? "Connected" : "Not configured"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
          {/* Active Config Pill */}
          {data.settings.waPhoneNumberId && (
            <div className="rounded-lg border border-hairline bg-surface-well/40 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-[12px]">
              <span className="text-body">
                Active Phone ID: <strong className="font-mono text-ink font-semibold">{data.settings.waPhoneNumberId}</strong>
              </span>
              {data.settings.waAppId && (
                <span className="text-mute font-mono text-[11px]">
                  Meta App ID: <span className="text-body">{data.settings.waAppId}</span>
                </span>
              )}
            </div>
          )}

          {/* Form Inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
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
                From Meta Developer Portal → WhatsApp → API Setup
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
                Permanent Access Token <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.waAccessToken ? "text" : "password"}
                  value={whatsappForm.waAccessToken}
                  onChange={(e) =>
                    setWhatsappForm((prev) => ({ ...prev, waAccessToken: e.target.value }))
                  }
                  placeholder={isWhatsAppConnected ? "••••••••••••••••••••••••••••••••  (Saved)" : "EAAG..."}
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
              <label className="block text-[12.5px] font-medium text-ink">
                Meta App ID <span className="text-mute font-normal">(Optional)</span>
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
                Used to address WhatsApp media uploads directly
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[12.5px] font-medium text-ink">
                WhatsApp App Secret <span className="text-mute font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Input
                  type={visibleSecrets.waAppSecret ? "text" : "password"}
                  value={whatsappForm.waAppSecret}
                  onChange={(e) =>
                    setWhatsappForm((prev) => ({ ...prev, waAppSecret: e.target.value }))
                  }
                  placeholder="App secret for webhook verification"
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
                Dedicated secret for payload signature verification
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="px-6 py-3.5 bg-surface-well/30 border-t border-hairline flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onVerify}
              disabled={busy !== null}
              className="h-8 px-3 cursor-pointer text-[12px]"
            >
              {busy === "verify-whatsapp" ? "Verifying…" : "Test Connection"}
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={busy !== null}
              className="h-8 px-4 cursor-pointer text-[12.5px] font-medium"
            >
              {busy === "save-whatsapp" ? "Saving…" : "Save Changes"}
            </Button>
          </div>

          {channelStatus.whatsapp && (
            <div
              className={`text-[12px] font-medium flex items-center gap-1.5 ${
                channelStatus.whatsapp.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
              }`}
            >
              <span>{channelStatus.whatsapp.ok ? "✓" : "!"}</span>
              <span>{channelStatus.whatsapp.detail}</span>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Message Template Manager Component */}
      <WhatsAppTemplateManager />
    </div>
  );
}
