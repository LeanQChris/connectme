"use client";

import { CopyCard } from "./copy-card";
import type { SettingsPayload } from "@/core/types";

interface WebhooksSettingsProps {
  data: SettingsPayload;
  metaUrl: string;
}

export function WebhooksSettings({ data, metaUrl }: WebhooksSettingsProps) {
  return (
    <div className="space-y-6">
      {/* 1. Inbound Webhooks & Security Status */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-canvas-elevated">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-well border border-hairline text-ink shadow-2xs">
              <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink">Inbound Webhooks & Gateway</h2>
                <span className="rounded bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] text-mute border border-hairline">
                  TLS 1.3
                </span>
              </div>
              <p className="text-[12.5px] text-mute mt-0.5">
                Cryptographically validated callback URLs for real-time customer event delivery.
              </p>
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
              Gateway Active
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-4">
          <CopyCard
            label="Meta Webhook Callback URL"
            value={metaUrl}
            badge="WhatsApp, Messenger & Instagram"
            hint="Paste into Meta App Dashboard &rarr; Webhooks &rarr; Edit Subscription &rarr; Callback URL"
          />

          <CopyCard
            label="Meta Webhook Verify Token"
            value={data.settings.webhookVerifyToken || "Not set — save settings to generate one"}
            badge="HMAC Token"
            hint="Must match the Verify Token specified in your Meta App Webhook subscription modal."
          />

          {data.webhookUrls.telegram && (
            <CopyCard
              label="Telegram Inbound Webhook URL"
              value={data.webhookUrls.telegram}
              badge="Bot API"
              hint="Registered automatically with the Telegram API when you click 'Auto-Register Webhook'."
            />
          )}

          {data.webhookUrls.discord && (
            <CopyCard
              label="Discord Interactions Endpoint URL"
              value={data.webhookUrls.discord}
              badge="Ed25519 Signed"
              hint="Paste into Discord Developer Portal &rarr; General Information &rarr; Interactions Endpoint URL."
            />
          )}

          {data.webhookUrls.slack && (
            <CopyCard
              label="Slack Events API Request URL"
              value={data.webhookUrls.slack}
              badge="Events API"
              hint="Paste into Slack App Dashboard &rarr; Event Subscriptions &rarr; Request URL."
            />
          )}
        </div>
      </div>

      {/* 2. Security & Verification Architecture */}
      <div className="rounded-xl border border-hairline bg-canvas-elevated p-6 shadow-2xs space-y-3">
        <h3 className="text-[14px] font-semibold text-ink flex items-center gap-2">
          <span>🔒</span>
          <span>Gateway Security & Payload Verification</span>
        </h3>
        <p className="text-[12.5px] text-mute leading-relaxed">
          Every inbound webhook payload received by ConnectMe is validated against cryptographic signatures before processing:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-lg border border-hairline bg-surface-well/40 p-3 space-y-1">
            <span className="font-mono text-[11px] font-semibold text-ink">Meta & WhatsApp</span>
            <p className="text-[11.5px] text-mute">
              Verified via <code className="font-mono text-ink">X-Hub-Signature-256</code> using your Meta App Secret.
            </p>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-well/40 p-3 space-y-1">
            <span className="font-mono text-[11px] font-semibold text-ink">Discord Gateway</span>
            <p className="text-[11.5px] text-mute">
              Validated using Ed25519 elliptic-curve signatures on every interaction request.
            </p>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-well/40 p-3 space-y-1">
            <span className="font-mono text-[11px] font-semibold text-ink">Slack & Telegram</span>
            <p className="text-[11.5px] text-mute">
              Protected via Slack Signing Secret (<code className="font-mono text-ink">X-Slack-Signature</code>) and secret bot header tokens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
