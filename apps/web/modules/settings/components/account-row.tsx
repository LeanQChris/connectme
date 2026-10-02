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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isMessenger
              ? "bg-[#1877F2]/10 text-[#1877F2]"
              : isInstagram
                ? "bg-[#E4405F]/10 text-[#E4405F]"
                : "bg-surface-well text-body"
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
          <span className="truncate text-[13px] font-semibold text-ink">{account.name}</span>
          <span className="text-[11px] text-mute truncate font-mono">
            {isMessenger ? "Facebook Page" : isInstagram ? "Instagram Handle" : account.channel} • ID: {account.externalId}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={onDisconnect}
        disabled={isBusy}
        className="self-end sm:self-auto h-7 text-[11.5px]"
      >
        {isBusy ? "Removing…" : "Disconnect"}
      </Button>
    </div>
  );
});
