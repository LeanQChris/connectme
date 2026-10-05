"use client";

import { useState } from "react";
import { CHANNELS, type Channel } from "@/core/types";
import { ChannelIcon, channelMeta } from "@/components/ui/channel-badge";
import { Button } from "@/components/ui/button";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (channel: Channel, recipient: string, initialMessage?: string) => Promise<void>;
}

export function NewConversationModal({
  isOpen,
  onClose,
  onSubmit,
}: NewConversationModalProps) {
  const [selectedChannel, setSelectedChannel] = useState<Channel>("whatsapp");
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      setError("Please enter a recipient / destination.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(selectedChannel, recipient.trim(), message.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation.");
    } finally {
      setLoading(false);
    }
  };

  const channelInfo = channelMeta(selectedChannel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-hairline bg-canvas p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-hairline">
          <div>
            <h3 className="text-base font-bold text-ink">New Outbound Conversation</h3>
            <p className="text-[12px] text-mute">Initiate a conversation across any connected channel.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-mute hover:bg-surface-well hover:text-ink transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Channel Selector */}
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1.5">Select Channel</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {CHANNELS.map((ch) => {
                const meta = channelMeta(ch);
                const active = selectedChannel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(ch);
                      setError(null);
                    }}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                      active
                        ? "border-ink bg-surface-well text-ink font-semibold shadow-xs"
                        : "border-hairline bg-canvas text-mute hover:text-ink hover:bg-surface-well/50"
                    }`}
                  >
                    <ChannelIcon channel={ch} className="h-5 w-5" />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient input */}
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1.5">
              {selectedChannel === "whatsapp" && "Phone Number (E.164 with country code)"}
              {selectedChannel === "telegram" && "Telegram Username or Chat ID"}
              {selectedChannel === "slack" && "Slack Channel ID or User ID (e.g. C12345678, U12345678)"}
              {selectedChannel === "discord" && "Discord Channel ID"}
              {selectedChannel === "messenger" && "Facebook PSID / User ID"}
              {selectedChannel === "instagram" && "Instagram IGSID / User ID"}
              {selectedChannel === "widget" && "Visitor ID"}
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={
                selectedChannel === "whatsapp"
                  ? "+14155552671"
                  : selectedChannel === "slack"
                  ? "C0123456789"
                  : selectedChannel === "telegram"
                  ? "@username or 12345678"
                  : "Recipient identifier"
              }
              className="w-full rounded-xl border border-hairline bg-surface-well/50 px-3 py-2 text-[13px] text-ink outline-none focus:border-ink transition-colors"
              autoFocus
            />
          </div>

          {/* Initial message */}
          <div>
            <label className="block text-[12px] font-medium text-ink mb-1.5">
              Initial Message <span className="text-mute font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type initial message..."
              className="w-full resize-none rounded-xl border border-hairline bg-surface-well/50 px-3 py-2 text-[13px] text-ink outline-none focus:border-ink transition-colors"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-[12px] text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading || !recipient.trim()}>
              {loading ? "Starting..." : `Start Conversation on ${channelInfo.label}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
