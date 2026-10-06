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
  const metaAccounts =
    data.settings.accounts?.filter(
      (a) => a.channel === "messenger" || a.channel === "instagram",
    ) || [];
  const accountsCount = metaAccounts.length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-hairline bg-canvas-elevated shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-canvas-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-messenger/10 text-messenger">
              <ChannelIcon channel="messenger" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Facebook & Instagram</h2>
              <p className="text-[12.5px] text-mute mt-0.5">
                Connect your Facebook Pages and Instagram Business handles.
              </p>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium ${
                isMetaConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-surface-well text-mute border border-hairline"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isMetaConnected ? "bg-emerald-500" : "bg-neutral-400"}`} />
              {isMetaConnected ? `${accountsCount} Connected` : "No accounts connected"}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-6">
          {/* Fast Connect Row */}
          <div className="rounded-lg border border-hairline bg-surface-well/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[13px] font-semibold text-ink">Connect via Meta OAuth</h3>
              <p className="text-[12px] text-mute mt-0.5">
                Automatically fetch and link your Facebook Pages and Instagram Direct accounts.
              </p>
            </div>

            <a
              href="/api/auth/meta/connect"
              className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md bg-[#1877F2] hover:bg-[#166fe5] px-3.5 text-[12.5px] font-medium text-white transition-opacity shadow-2xs cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {isMetaConnected ? "Add / Reconnect Pages" : "Connect Facebook"}
            </a>
          </div>

          {/* Connected Accounts List */}
          {metaAccounts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[12.5px] font-medium text-ink">
                Connected Handles & Pages ({metaAccounts.length})
              </h3>
              <div className="divide-y divide-hairline rounded-lg border border-hairline bg-canvas overflow-hidden">
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

          {/* Manual Developer Overrides */}
          <div className="border-t border-hairline pt-4">
            <button
              type="button"
              onClick={() => setShowManualMeta((prev) => !prev)}
              className="text-[12px] font-medium text-mute hover:text-ink transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>{showManualMeta ? "▼" : "▶"}</span>
              <span>Advanced: Custom Meta Developer Keys</span>
            </button>

            {showManualMeta && (
              <div className="mt-3 rounded-lg border border-hairline bg-surface-well/20 p-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-[11.5px] font-medium text-ink">Page Access Token</label>
                    <div className="relative">
                      <Input
                        type={visibleSecrets.pageAccessToken ? "text" : "password"}
                        value={metaForm.pageAccessToken}
                        onChange={(e) =>
                          setMetaForm((prev) => ({ ...prev, pageAccessToken: e.target.value }))
                        }
                        placeholder={isMetaConnected ? "••••••••••••••••••••••••••••••••  (Saved)" : "EAA..."}
                        className="h-8 pr-14 font-mono text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret("pageAccessToken")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10.5px] text-mute hover:text-ink cursor-pointer px-1 py-0.5"
                      >
                        {visibleSecrets.pageAccessToken ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11.5px] font-medium text-ink">Meta / Facebook App Secret</label>
                    <div className="relative">
                      <Input
                        type={visibleSecrets.metaAppSecret ? "text" : "password"}
                        value={metaForm.metaAppSecret}
                        onChange={(e) =>
                          setMetaForm((prev) => ({ ...prev, metaAppSecret: e.target.value }))
                        }
                        placeholder="App Secret"
                        className="h-8 pr-14 font-mono text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret("metaAppSecret")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10.5px] text-mute hover:text-ink cursor-pointer px-1 py-0.5"
                      >
                        {visibleSecrets.metaAppSecret ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11.5px] font-medium text-ink">Instagram App Secret</label>
                    <div className="relative">
                      <Input
                        type={visibleSecrets.instagramAppSecret ? "text" : "password"}
                        value={metaForm.instagramAppSecret}
                        onChange={(e) =>
                          setMetaForm((prev) => ({ ...prev, instagramAppSecret: e.target.value }))
                        }
                        placeholder="Instagram App Secret (if separate)"
                        className="h-8 pr-14 font-mono text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret("instagramAppSecret")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10.5px] text-mute hover:text-ink cursor-pointer px-1 py-0.5"
                      >
                        {visibleSecrets.instagramAppSecret ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11.5px] font-medium text-ink">Webhook Verify Token</label>
                    <Input
                      type="text"
                      value={metaForm.webhookVerifyToken}
                      onChange={(e) =>
                        setMetaForm((prev) => ({ ...prev, webhookVerifyToken: e.target.value }))
                      }
                      placeholder="Leave blank to keep the current token"
                      className="h-8 font-mono text-[12px]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={onSave}
                    disabled={busy !== null}
                    className="h-7 px-3 text-[12px]"
                  >
                    {busy === "save-meta" ? "Saving…" : "Save Custom Keys"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onVerify}
                    disabled={busy !== null}
                    className="h-7 px-2.5 text-[12px]"
                  >
                    {busy === "verify-page" ? "Verifying…" : "Test Token"}
                  </Button>
                  {channelStatus.meta && (
                    <span
                      className={`text-[11.5px] font-medium ${
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
    </div>
  );
}
