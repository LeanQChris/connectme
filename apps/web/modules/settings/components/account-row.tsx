"use client";

import { memo } from "react";
import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import type { ConnectedAccount } from "@/core/types";

interface AccountRowProps {
  account: ConnectedAccount;
  onDisconnect: () => void;
  isBusy: boolean;
}

export const AccountRow = memo(function AccountRow({ account, onDisconnect, isBusy }: AccountRowProps) {
  const isMessenger = account.channel === "messenger";
  const isInstagram = account.channel === "instagram";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-surface-well/40">
      <div className="flex items-center gap-3.5 min-w-0">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${
            isMessenger
              ? "bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20"
              : isInstagram
                ? "bg-[#E4405F]/10 text-[#E4405F] border-[#E4405F]/20"
                : "bg-surface-well text-body border-hairline"
          }`}
        >
          {isMessenger ? (
            <ChannelIcon channel="messenger" className="h-4 w-4" />
          ) : isInstagram ? (
            <ChannelIcon channel="instagram" className="h-4 w-4" />
          ) : (
            <ChannelIcon channel={account.channel} className="h-4 w-4" />
          )}
        </span>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-ink">{account.name}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.2 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
          <span className="text-[11px] text-mute truncate font-mono mt-0.5">
            {isMessenger ? "Facebook Page" : isInstagram ? "Instagram Business Handle" : account.channel} • ID: {account.externalId}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onDisconnect}
        disabled={isBusy}
        className="self-end sm:self-auto h-7 px-2.5 text-[11.5px] cursor-pointer"
      >
        {isBusy ? "Removing…" : "Disconnect"}
      </Button>
    </div>
  );
});
