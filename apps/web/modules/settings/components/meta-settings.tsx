"use client";

import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountRow } from "./account-row";
import type { SettingsPayload } from "@/core/types";

interface MetaSettingsProps {
  data: SettingsPayload;
  isMetaConnected: boolean;
  metaForm: {
    pageAccessToken: string;
    metaAppSecret: string;
    webhookVerifyToken: string;
  };
  setMetaForm: React.Dispatch<
    React.SetStateAction<{
      pageAccessToken: string;
      metaAppSecret: string;
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
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-hairline">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-messenger/10 text-messenger">
              <ChannelIcon channel="messenger" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Facebook Messenger & Instagram</h2>
              <p className="text-[12.5px] text-body">
                Connect your Facebook Pages and Instagram Professional handles into the unified queue.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium self-start sm:self-auto ${
              isMetaConnected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-surface-well text-mute border border-hairline"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isMetaConnected ? "bg-emerald-500" : "bg-neutral-400"}`}
            />
            {isMetaConnected ? "Connected" : "No accounts connected"}
          </span>
        </div>

        {/* 1-Click OAuth Connect Button */}
        <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">1-Click Fast Connect (Recommended)</h3>
              <p className="text-[12px] text-body mt-0.5">
                Connect automatically through Meta OAuth. Fetches all your Facebook Pages and connected Instagram Business accounts instantly.
              </p>
            </div>

            <a
              href="/api/auth/meta/connect"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-95 shadow-xs cursor-pointer"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {isMetaConnected ? "Add / Reconnect Pages" : "Connect with Facebook"}
            </a>
          </div>
        </div>

        {/* Connected Accounts List */}
        {data.settings.accounts && data.settings.accounts.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[13px] font-semibold text-ink mb-2">
              Connected Accounts ({data.settings.accounts.length}):
            </h3>
            <div className="divide-y divide-hairline rounded-lg border border-hairline bg-canvas">
              {data.settings.accounts.map((acc) => (
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

        {/* Manual Developer Overrides (Collapsed) */}
        <div className="mt-6 border-t border-hairline pt-4">
          <button
            type="button"
            onClick={() => setShowManualMeta((prev) => !prev)}
            className="text-[12.5px] font-medium text-body hover:text-ink transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>{showManualMeta ? "▼" : "▶"}</span>
            <span>Advanced: Enter Custom Meta Developer Keys Manually</span>
          </button>

          {showManualMeta && (
            <div className="mt-4 rounded-xl border border-hairline bg-surface-well/50 p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Page Access Token */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-ink">Page Access Token</label>
                  <div className="relative">
                    <Input
                      type={visibleSecrets.pageAccessToken ? "text" : "password"}
                      value={metaForm.pageAccessToken}
                      onChange={(e) =>
                        setMetaForm((prev) => ({ ...prev, pageAccessToken: e.target.value }))
                      }
                      placeholder={isMetaConnected ? "•••••••••••• (saved)" : "EAA..."}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret("pageAccessToken")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
                    >
                      {visibleSecrets.pageAccessToken ? "Hide" : "Show"}
                    </button>
                  </div>
                  <span className="text-[11px] text-mute">Permanent Page Token for Messenger / Instagram</span>
                </div>

                {/* Meta App Secret */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-ink">Meta App Secret</label>
                  <div className="relative">
                    <Input
                      type={visibleSecrets.metaAppSecret ? "text" : "password"}
                      value={metaForm.metaAppSecret}
                      onChange={(e) =>
                        setMetaForm((prev) => ({ ...prev, metaAppSecret: e.target.value }))
                      }
                      placeholder="App Secret from Meta Basic Settings"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret("metaAppSecret")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-ink text-xs p-1"
                    >
                      {visibleSecrets.metaAppSecret ? "Hide" : "Show"}
                    </button>
                  </div>
                  <span className="text-[11px] text-mute">Verifies X-Hub-Signature-256 for Page webhooks</span>
                </div>

                {/* Webhook Verify Token */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-[12px] font-medium text-ink">Webhook Verify Token</label>
                  <Input
                    type="text"
                    value={metaForm.webhookVerifyToken}
                    onChange={(e) =>
                      setMetaForm((prev) => ({ ...prev, webhookVerifyToken: e.target.value }))
                    }
                    placeholder={data.settings.webhookVerifyToken || "connectme_verify"}
                  />
                  <span className="text-[11px] text-mute">Must match the token entered in your Meta Webhooks dashboard</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onSave}
                  disabled={busy !== null}
                >
                  {busy === "save-meta" ? "Saving…" : "Save Custom Keys"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onVerify}
                  disabled={busy !== null}
                >
                  {busy === "verify-page" ? "Verifying…" : "Verify Custom Token"}
                </Button>
                {channelStatus.meta && (
                  <span
                    className={`text-[12px] font-medium ${
                      channelStatus.meta.ok ? "text-emerald-600 dark:text-emerald-400" : "text-error"
                    }`}
                  >
                    {channelStatus.meta.detail}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
