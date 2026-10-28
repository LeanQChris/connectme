"use client";

import { useState } from "react";
import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountRow } from "./account-row";
import { CopyCard } from "./copy-card";
import { settingsApi } from "../api/settings.api";
import type { SettingsPayload } from "@/core/types";

interface MetaSettingsProps {
  data: SettingsPayload;
  isMetaConnected: boolean;
  metaForm: {
    pageAccessToken: string;
    metaAppSecret: string;
    instagramAppSecret: string;
    webhookVerifyToken: string;
  };
  setMetaForm: React.Dispatch<
    React.SetStateAction<{
      pageAccessToken: string;
      metaAppSecret: string;
      instagramAppSecret: string;
      webhookVerifyToken: string;
    }>
  >;
  showManualMeta: boolean;
  setShowManualMeta: React.Dispatch<React.SetStateAction<boolean>>;
  visibleSecrets: Record<string, boolean>;
  toggleSecret: (key: string) => void;
  busy: string | null;
  channelStatus: Record<string, { ok: boolean; detail: string }>;
  onSave: () => void;
  onVerify: () => void;
  onDisconnectAccount: (accountId: string) => void;
}

export function MetaSettings({
  data,
  isMetaConnected,
  metaForm,
  setMetaForm,
  showManualMeta,
  setShowManualMeta,
  visibleSecrets,
  toggleSecret,
  busy,
  channelStatus,
  onSave,
  onVerify,
  onDisconnectAccount,
}: MetaSettingsProps) {
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isConnectingOauth, setIsConnectingOauth] = useState(false);

  const metaAccounts =
    data.settings.accounts?.filter(
      (a) => a.channel === "messenger" || a.channel === "instagram",
    ) || [];
  const accountsCount = metaAccounts.length;

  const handleConnectMeta = async () => {
    try {
      setIsConnectingOauth(true);
      setOauthError(null);
      const res = await settingsApi.getMetaAuthUrl();
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      } else {
        throw new Error("Did not receive a valid Meta authorization URL.");
      }
    } catch (err: unknown) {
      setOauthError(
        (err instanceof Error ? err.message : null) ||
          "Meta OAuth is unavailable. Please verify your Meta App credentials or use custom keys below.",
      );
      setShowManualMeta(true);
    } finally {
      setIsConnectingOauth(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-canvas-elevated">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-messenger/10 text-messenger shadow-2xs">
              <ChannelIcon channel="messenger" className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink">Facebook Pages & Instagram Direct</h2>
                <span className="rounded bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] text-mute border border-hairline">
                  Graph API v22.0
                </span>
              </div>
              <p className="text-[12.5px] text-mute mt-0.5">
                Link Facebook Business Pages and professional Instagram handles via fast OAuth or custom tokens.
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
              Meta Console ↗
            </a>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isMetaConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isMetaConnected ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-neutral-400"
                }`}
              />
              {isMetaConnected ? `${accountsCount} Linked` : "Not connected"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Fast Connect Row */}
          <div className="rounded-xl border border-hairline bg-surface-well/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[13.5px] font-semibold text-ink">Fast Connect via Meta OAuth</h3>
                {!data.oauth?.metaConfigured && (
                  <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10.5px] font-mono font-medium">
                    OAuth App ID Not Set
                  </span>
                )}
              </div>
              <p className="text-[12px] text-mute">
                Automatically retrieve and connect all your managed Facebook Pages and Instagram accounts with PKCE security.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConnectMeta}
              disabled={busy !== null || isConnectingOauth}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] text-white px-4 text-[12.5px] font-medium shadow-2xs cursor-pointer border-none disabled:opacity-50"
            >
              {isConnectingOauth ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Connecting…
                </span>
              ) : (
                <>
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  {isMetaConnected ? "Add / Reconnect Pages" : "Connect with Facebook"}
                </>
              )}
            </Button>
          </div>

          {oauthError && (
            <div className="rounded-xl border border-error/20 bg-error/10 p-4 text-[12.5px] text-error flex items-start justify-between gap-3 animate-fadeIn">
              <div>
                <p className="font-semibold">Unable to initiate Meta OAuth</p>
                <p className="mt-0.5 text-error/90">{oauthError}</p>
              </div>
              <button
                type="button"
                onClick={() => setOauthError(null)}
                className="font-mono text-xs opacity-70 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Connected Accounts List */}
          {metaAccounts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-semibold text-ink">
                  Linked Pages & Handles ({metaAccounts.length})
                </h4>
                <span className="font-mono text-[11px] text-mute">
                  Ready to receive messages
                </span>
              </div>

              <div className="rounded-xl border border-hairline divide-y divide-hairline bg-canvas overflow-hidden">
                {metaAccounts.map((acc) => (
                  <AccountRow
                    key={acc.id}
                    account={acc}
                    onDisconnect={() => onDisconnectAccount(acc.id)}
                    isBusy={busy === `disconnect-${acc.id}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inline Webhook Card */}
          {data.webhookUrls.meta && (
            <CopyCard
              label="Meta Webhook Callback URL"
              value={data.webhookUrls.meta}
              hint="In your Meta App Dashboard &rarr; Webhooks &rarr; Page / Instagram, set this Callback URL and subscribe to 'messages' and 'messaging_postbacks'."
              badge="Inbound Webhook"
            />
          )}

          {/* Manual Developer Keys & Override Drawer */}
          <div className="rounded-xl border border-hairline bg-canvas p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[13px] font-semibold text-ink">
                  Manual Developer Keys & Secrets
                </h4>
                <p className="text-[11.5px] text-mute">
                  Optional direct token overrides and HMAC verification secrets.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowManualMeta(!showManualMeta)}
                className="h-7 px-2.5 text-[11.5px] cursor-pointer"
              >
                {showManualMeta ? "Collapse Keys ↑" : "Edit Developer Keys ↓"}
              </Button>
            </div>

            {showManualMeta && (
              <div className="pt-3 border-t border-hairline space-y-4 animate-fadeIn">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-medium text-ink">
                      Page Access Token
                    </label>
                    <div className="relative">
                      <Input
                        type={visibleSecrets.pageAccessToken ? "text" : "password"}
                        value={metaForm.pageAccessToken}
                        onChange={(e) =>
                          setMetaForm((prev) => ({ ...prev, pageAccessToken: e.target.value }))
                        }
                        placeholder={
                          data.settings.pageName
                            ? `Connected: ${data.settings.pageName}`
                            : "EAAG..."
                        }
                        className="h-8 pr-14 font-mono text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret("pageAccessToken")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10.5px] text-mute hover:text-ink cursor-pointer"
                      >
                        {visibleSecrets.pageAccessToken ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-medium text-ink">
                      Meta App Secret
                    </label>
                    <div className="relative">
                      <Input
                        type={visibleSecrets.metaAppSecret ? "text" : "password"}
                        value={metaForm.metaAppSecret}
                        onChange={(e) =>
                          setMetaForm((prev) => ({ ...prev, metaAppSecret: e.target.value }))
                        }
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="h-8 pr-14 font-mono text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret("metaAppSecret")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10.5px] text-mute hover:text-ink cursor-pointer"
                      >
                        {visibleSecrets.metaAppSecret ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-medium text-ink">
                      Instagram App Secret
                    </label>
                    <div className="relative">
                      <Input
                        type={visibleSecrets.instagramAppSecret ? "text" : "password"}
                        value={metaForm.instagramAppSecret}
                        onChange={(e) =>
                          setMetaForm((prev) => ({ ...prev, instagramAppSecret: e.target.value }))
                        }
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="h-8 pr-14 font-mono text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret("instagramAppSecret")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10.5px] text-mute hover:text-ink cursor-pointer"
                      >
                        {visibleSecrets.instagramAppSecret ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-medium text-ink">
                      Webhook Verify Token
                    </label>
                    <Input
                      type="text"
                      value={metaForm.webhookVerifyToken}
                      onChange={(e) =>
                        setMetaForm((prev) => ({ ...prev, webhookVerifyToken: e.target.value }))
                      }
                      placeholder={data.settings.webhookVerifyToken || "Generate custom token"}
                      className="h-8 font-mono text-[12px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onVerify}
                    disabled={busy !== null}
                    className="h-7 px-2.5 text-[12px] cursor-pointer"
                  >
                    {busy === "verify-page" ? "Testing…" : "Test Page Token"}
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={onSave}
                    disabled={busy !== null}
                    className="h-7 px-3.5 text-[12px] font-medium cursor-pointer"
                  >
                    {busy === "save-meta" ? "Saving…" : "Save Custom Keys"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {channelStatus.page && (
            <div
              className={`p-3 rounded-lg text-[12px] font-mono flex items-center gap-2 ${
                channelStatus.page.ok
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-error border border-red-500/20"
              }`}
            >
              <span>{channelStatus.page.ok ? "✓" : "✕"}</span>
              <span>{channelStatus.page.detail}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
