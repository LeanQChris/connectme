"use client";

import React, { useState } from "react";
import { ChannelIcon } from "@/components/ui/channel-badge";
import type { Channel } from "@/core/types";
import { cn } from "@/core/utils/cn";

interface ChannelSpec {
  id: Channel;
  name: string;
  tagline: string;
  endpoint: string;
  policy: string;
  authMethod: string;
  webhookRoute: string;
  supportedMedia: string[];
  rawWebhook: object;
  normalizedEvent: object;
}

const CHANNELS: ChannelSpec[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    tagline: "Meta Cloud API v21.0",
    endpoint: "POST graph.facebook.com/v21.0/{phone_number_id}/messages",
    policy: "Strict 24h rolling customer-care window",
    authMethod: "System User Permanent Token + AES-256",
    webhookRoute: "/api/webhook/whatsapp",
    supportedMedia: ["Text", "Voice notes (.ogg)", "Images", "PDF Documents", "Quick replies"],
    rawWebhook: {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_98231023",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                contacts: [{ profile: { name: "Sophia Martinez" }, wa_id: "+14155552671" }],
                messages: [
                  {
                    from: "+14155552671",
                    id: "wamid.HBgLMTQxNTU1NTI2NzEVAgASGB...",
                    timestamp: "1729891200",
                    type: "text",
                    text: { body: "Hey! Can we reschedule our onboarding session to 3 PM?" }
                  }
                ]
              }
            }
          ]
        }
      ]
    },
    normalizedEvent: {
      id: "msg_wa_991823",
      tenantId: "org_7f81a20",
      channel: "whatsapp",
      sender: {
        id: "+14155552671",
        name: "Sophia Martinez",
        handle: "+1 (415) 555-2671"
      },
      content: "Hey! Can we reschedule our onboarding session to 3 PM?",
      direction: "inbound",
      windowExpiresAt: "2026-10-26T15:00:00.000Z",
      windowRemainingMs: 86400000,
      status: "delivered"
    }
  },
  {
    id: "messenger",
    name: "Facebook Messenger",
    tagline: "Meta Graph API v21.0",
    endpoint: "POST graph.facebook.com/v21.0/me/messages",
    policy: "24h standard messaging window with Page scoping",
    authMethod: "Page Access Token with pages_messaging scope",
    webhookRoute: "/api/webhook/messenger",
    supportedMedia: ["Text", "Images", "Audio", "Generic templates", "Quick reply pills"],
    rawWebhook: {
      object: "page",
      entry: [
        {
          id: "PAGE_10928301",
          time: 1729891245,
          messaging: [
            {
              sender: { id: "psid_8471928" },
              recipient: { id: "PAGE_10928301" },
              timestamp: 1729891245,
              message: {
                mid: "m_mid.$cAAAb18274h91...",
                text: "Do you have the pricing tier for team of 15?"
              }
            }
          ]
        }
      ]
    },
    normalizedEvent: {
      id: "msg_ms_381029",
      tenantId: "org_7f81a20",
      channel: "messenger",
      sender: {
        id: "psid_8471928",
        name: "David Kim",
        handle: "Messenger User #8471"
      },
      content: "Do you have the pricing tier for team of 15?",
      direction: "inbound",
      windowExpiresAt: "2026-10-26T15:00:45.000Z",
      windowRemainingMs: 86400000,
      status: "delivered"
    }
  },
  {
    id: "instagram",
    name: "Instagram Direct",
    tagline: "Meta Graph API Instagram Messaging",
    endpoint: "POST graph.facebook.com/v21.0/me/messages",
    policy: "24h window from customer direct message or story reply",
    authMethod: "Instagram Business Account Token + Webhook Secret",
    webhookRoute: "/api/webhook/instagram",
    supportedMedia: ["Text", "Story mentions", "Images", "Reactions", "Quick replies"],
    rawWebhook: {
      object: "instagram",
      entry: [
        {
          id: "IG_1784140029",
          time: 1729891310,
          messaging: [
            {
              sender: { id: "igsid_918237" },
              recipient: { id: "IG_1784140029" },
              timestamp: 1729891310,
              message: {
                mid: "aWdfbWVzc2FnZToxO...",
                text: "Sent you a DM regarding the design contract!"
              }
            }
          ]
        }
      ]
    },
    normalizedEvent: {
      id: "msg_ig_571920",
      tenantId: "org_7f81a20",
      channel: "instagram",
      sender: {
        id: "igsid_918237",
        name: "Elena Rostova",
        handle: "@elena_design"
      },
      content: "Sent you a DM regarding the design contract!",
      direction: "inbound",
      windowExpiresAt: "2026-10-26T15:01:50.000Z",
      windowRemainingMs: 86400000,
      status: "delivered"
    }
  },
  {
    id: "telegram",
    name: "Telegram Bot API",
    tagline: "Telegram Bot Gateway",
    endpoint: "POST api.telegram.org/bot{token}/sendMessage",
    policy: "Indefinite reply window (User-initiated bot conversation)",
    authMethod: "Bot API Token + Secret Webhook Token header",
    webhookRoute: "/api/webhook/telegram",
    supportedMedia: ["Text", "Markdown formatting", "Voice (.oga)", "Photos", "Custom keyboards"],
    rawWebhook: {
      update_id: 88291024,
      message: {
        message_id: 4092,
        from: {
          id: 61928471,
          is_bot: false,
          first_name: "Alex",
          last_name: "Rivers",
          username: "arivers_tech"
        },
        chat: { id: 61928471, type: "private" },
        date: 1729891380,
        text: "Is there a webhook health endpoint for production status?"
      }
    },
    normalizedEvent: {
      id: "msg_tg_881923",
      tenantId: "org_7f81a20",
      channel: "telegram",
      sender: {
        id: "tg_61928471",
        name: "Alex Rivers",
        handle: "@arivers_tech"
      },
      content: "Is there a webhook health endpoint for production status?",
      direction: "inbound",
      windowExpiresAt: null,
      windowRemainingMs: null,
      status: "delivered"
    }
  },
  {
    id: "discord",
    name: "Discord Bot & Gateway",
    tagline: "Discord Gateway v10",
    endpoint: "POST discord.com/api/v10/channels/{id}/messages",
    policy: "Permanent thread / channel context",
    authMethod: "Bot Token with MESSAGE_CONTENT intent",
    webhookRoute: "/api/webhook/discord",
    supportedMedia: ["Text", "Code snippets", "Embeds", "File attachments", "Reactions"],
    rawWebhook: {
      type: 0,
      id: "1298492019485718",
      channel_id: "1092837492817263",
      guild_id: "8917263548192039",
      author: {
        id: "481928471928374",
        username: "clara_dev",
        discriminator: "0"
      },
      content: "Can we configure auto-assignment for incoming support requests?",
      timestamp: "2026-10-25T15:04:10.000Z"
    },
    normalizedEvent: {
      id: "msg_dc_491028",
      tenantId: "org_7f81a20",
      channel: "discord",
      sender: {
        id: "dc_481928471928374",
        name: "clara_dev",
        handle: "@clara_dev"
      },
      content: "Can we configure auto-assignment for incoming support requests?",
      direction: "inbound",
      windowExpiresAt: null,
      windowRemainingMs: null,
      status: "delivered"
    }
  }
];

export function ChannelProtocolInspector() {
  const [selectedChannelId, setSelectedChannelId] = useState<Channel>("whatsapp");
  const [viewMode, setViewMode] = useState<"normalized" | "raw">("normalized");

  const activeChannel = CHANNELS.find((c) => c.id === selectedChannelId) || CHANNELS[0];

  return (
    <div className="rounded-[16px] border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
      {/* Top Channel Navigation Tabs */}
      <div className="flex border-b border-hairline bg-canvas overflow-x-auto no-scrollbar">
        {CHANNELS.map((channel) => {
          const isSelected = channel.id === selectedChannelId;
          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => setSelectedChannelId(channel.id)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium border-r border-hairline transition-colors shrink-0 cursor-pointer select-none",
                isSelected
                  ? "bg-canvas-elevated text-ink border-b-2 border-b-ink"
                  : "text-mute hover:text-ink hover:bg-canvas-elevated/50"
              )}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                style={{ background: `var(--spectrum-${channel.id})` }}
              >
                <ChannelIcon channel={channel.id} className="h-[11px] w-[11px]" />
              </span>
              <span>{channel.name}</span>
            </button>
          );
        })}
      </div>

      {/* Channel Specification Details */}
      <div className="p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)] lg:gap-10 items-start">
          {/* Left Metadata & Policies */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-mute">
                  Provider Gateway
                </span>
                <span className="rounded-full bg-surface-well px-2 py-0.5 font-mono text-[10px] text-ink font-medium">
                  {activeChannel.tagline}
                </span>
              </div>
              <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-ink">
                {activeChannel.name}
              </h3>
              <p className="mt-1 font-mono text-[12px] text-body break-all bg-surface-well/70 rounded-md p-2 border border-hairline">
                {activeChannel.endpoint}
              </p>
            </div>

            <div className="space-y-3.5 border-t border-hairline pt-5">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-mute block">
                  Reply Policy Enforcement
                </span>
                <p className="mt-1 text-[13.5px] font-medium text-ink flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      activeChannel.policy.includes("24h")
                        ? "bg-amber-500 animate-pulse"
                        : "bg-emerald-500"
                    )}
                  />
                  {activeChannel.policy}
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-mute block">
                  Secret Vaulting
                </span>
                <p className="mt-1 text-[13px] text-body">{activeChannel.authMethod}</p>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-mute block">
                  Inbound Webhook Verification
                </span>
                <p className="mt-1 font-mono text-[12px] text-ink">
                  {activeChannel.webhookRoute}{" "}
                  <span className="text-mute font-sans text-[11px]">
                    (Timing-safe HMAC-SHA256)
                  </span>
                </p>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-mute block mb-1.5">
                  Supported Media & Attachments
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeChannel.supportedMedia.map((media) => (
                    <span
                      key={media}
                      className="rounded-[5px] border border-hairline bg-surface-well px-2 py-0.5 text-[11px] font-medium text-body"
                    >
                      {media}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right JSON Schema Comparison Terminal */}
          <div className="rounded-[12px] border border-hairline bg-canvas p-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                <span className="ml-2 font-mono text-[11px] text-mute">
                  {viewMode === "normalized" ? "CanonicalMessageEvent" : "Raw Webhook Payload"}
                </span>
              </div>

              <div className="flex rounded-[6px] border border-hairline bg-canvas-elevated p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("normalized")}
                  className={cn(
                    "rounded-[4px] px-2.5 py-1 font-mono text-[10.5px] transition-colors cursor-pointer",
                    viewMode === "normalized"
                      ? "bg-primary text-on-primary font-medium"
                      : "text-mute hover:text-ink"
                  )}
                >
                  Normalized
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("raw")}
                  className={cn(
                    "rounded-[4px] px-2.5 py-1 font-mono text-[10.5px] transition-colors cursor-pointer",
                    viewMode === "raw"
                      ? "bg-primary text-on-primary font-medium"
                      : "text-mute hover:text-ink"
                  )}
                >
                  Raw Webhook
                </button>
              </div>
            </div>

            <pre className="mt-3.5 max-h-[300px] overflow-auto rounded-[8px] bg-surface-well/80 p-3.5 font-mono text-[11.5px] leading-relaxed text-ink">
              <code>
                {JSON.stringify(
                  viewMode === "normalized"
                    ? activeChannel.normalizedEvent
                    : activeChannel.rawWebhook,
                  null,
                  2
                )}
              </code>
            </pre>

            <div className="mt-3 flex items-center justify-between text-[11px] text-mute px-1">
              <span>Transformed in under 4ms</span>
              <span className="font-mono text-emerald-500 font-semibold">
                ✓ Schema Validated
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
