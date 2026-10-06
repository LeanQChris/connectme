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
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-well border border-hairline text-ink">
              <svg className="h-5 w-5 stroke-current" fill="none" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Inbound Webhooks & Endpoints</h2>
              <p className="text-[12.5px] text-mute mt-0.5">
                Endpoints and verification tokens for your external platform developer consoles.
              </p>
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Gateway Ready
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-4">
          <CopyCard
            label="Meta Webhook Callback URL (WhatsApp, Messenger & Instagram)"
            value={metaUrl}
            hint="Paste into Meta App Dashboard → Webhooks → Edit Subscription → Callback URL"
          />

          <CopyCard
            label="Meta Webhook Verify Token"
            value={data.settings.webhookVerifyToken || "connectme_verify"}
            hint="Must match Verify Token in your Meta Webhooks setup"
          />

          {data.webhookUrls.telegram && (
            <CopyCard
              label="Telegram Inbound Webhook URL"
              value={data.webhookUrls.telegram}
              hint="Registered automatically with Telegram API when using 'Auto-Register Webhook'"
            />
          )}

          {data.webhookUrls.discord && (
            <CopyCard
              label="Discord Interactions Endpoint URL"
              value={data.webhookUrls.discord}
              hint="Paste into Discord Developer Portal → General Information → Interactions Endpoint URL"
            />
          )}

          {data.webhookUrls.slack && (
            <CopyCard
              label="Slack Events API Request URL"
              value={data.webhookUrls.slack}
              hint="Paste into Slack App Dashboard → Event Subscriptions → Request URL"
            />
          )}
        </div>
      </div>
    </div>
  );
}
