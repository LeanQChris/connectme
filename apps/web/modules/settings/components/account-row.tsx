"use client";

import { memo, useState } from "react";
import { ChannelIcon } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";
import type { ConnectedAccount } from "@/core/types";

interface AccountRowProps {
  account: ConnectedAccount;
  onDisconnect: () => void;
  isBusy: boolean;
}

export const AccountRow = memo(function AccountRow({
  account,
  onDisconnect,
  isBusy,
}: AccountRowProps) {
  const [confirming, setConfirming] = useState(false);

  const isMessenger = account.channel === "messenger";
  const isInstagram = account.channel === "instagram";

  const handleDisconnectClick = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onDisconnect();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-surface-well/30">
      <div className="flex items-center gap-3.5 min-w-0">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${
            isMessenger
              ? "bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20"
              : isInstagram
                ? "bg-[#E4405F]/10 text-[#E4405F] border-[#E4405F]/20"
                : "bg-surface-well text-body border-hairline"
          }`}
        >
          {isMessenger ? (
            <ChannelIcon channel="messenger" className="h-5 w-5" />
          ) : isInstagram ? (
            <ChannelIcon channel="instagram" className="h-5 w-5" />
          ) : (
            <ChannelIcon channel={account.channel} className="h-5 w-5" />
          )}
        </span>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-semibold text-ink">
              {account.name}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-mute font-mono mt-0.5">
            <span>
              {isMessenger
                ? "Facebook Page"
                : isInstagram
                  ? "Instagram Business"
                  : account.channel.toUpperCase()}
            </span>
            <span>•</span>
            <span className="truncate">ID: {account.externalId}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
        {confirming ? (
          <div className="flex items-center gap-2 animate-fadeIn">
            <span className="text-[11.5px] text-error font-medium">Remove account?</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDisconnectClick}
              disabled={isBusy}
              className="h-7 px-2.5 text-[11.5px] cursor-pointer"
            >
              {isBusy ? "Removing…" : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
              className="h-7 px-2 text-[11.5px] cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDisconnectClick}
            disabled={isBusy}
            className="h-7 px-2.5 text-[11.5px] text-mute hover:text-error hover:border-error/30 cursor-pointer"
          >
            Disconnect
          </Button>
        )}
      </div>
    </div>
  );
});
