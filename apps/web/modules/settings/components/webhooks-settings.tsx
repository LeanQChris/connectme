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
      <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
        <div className="pb-4 border-b border-hairline">
          <h2 className="text-[16px] font-semibold text-ink">Inbound Webhooks & Endpoints</h2>
          <p className="mt-1 text-[12.5px] text-body">
            Copy these endpoint URLs into your respective platform developer consoles to route messages into ConnectMe.
          </p>
        </div>

        <div className="mt-5 space-y-3.5">
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
              label="Telegram Webhook URL"
              value={data.webhookUrls.telegram}
              hint="Set automatically via 'Auto-Register Webhook' in the Telegram tab"
            />
          )}

          {data.webhookUrls.discord && (
            <CopyCard
              label="Discord Interactions Endpoint URL"
              value={data.webhookUrls.discord}
              hint="Paste into Discord Developer Portal → General Information → Interactions Endpoint URL"
            />
          )}
        </div>
      </div>
    </div>
  );
}
