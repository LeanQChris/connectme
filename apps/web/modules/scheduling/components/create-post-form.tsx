"use client";

import { useMemo, useState } from "react";
import type { ConnectedAccount } from "@/core/types";
import { Button } from "@/components/ui/button";
import { ChannelIcon } from "@/components/ui/channel-badge";
import {
  isPostSchedulable,
  type ScheduledPost,
} from "../data/scheduling.types";
import {
  useCreateScheduledPost,
  useUpdateScheduledPost,
  useUploadPostMedia,
} from "../hooks/use-scheduling";
import { SchedulePicker } from "./schedule-picker";

interface CreatePostFormProps {
  accounts: ConnectedAccount[];
  editing?: ScheduledPost | null;
  onDone?: () => void;
  onCancelEdit?: () => void;
}

type PreviewNetwork = "instagram" | "messenger" | "telegram" | "discord";

export function CreatePostForm({
  accounts,
  editing,
  onDone,
  onCancelEdit,
}: CreatePostFormProps) {
  const schedulable = useMemo(() => accounts.filter((a) => isPostSchedulable(a)), [accounts]);

  // Single or multi-account broadcast selection
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    if (editing?.accountId) return [editing.accountId];
    return schedulable[0]?.id ? [schedulable[0].id] : [];
  });

  const [caption, setCaption] = useState(editing?.caption ?? "");
  const [mediaUrls, setMediaUrls] = useState<string[]>(editing?.mediaUrls ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState<PreviewNetwork>("instagram");
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadPostMedia();
  const createMutation = useCreateScheduledPost();
  const updateMutation = useUpdateScheduledPost();
  const pending = createMutation.isPending || updateMutation.isPending || uploadMutation.isPending;

  const selectedAccounts = useMemo(
    () => schedulable.filter((a) => selectedAccountIds.includes(a.id)),
    [schedulable, selectedAccountIds],
  );

  const isNative = selectedAccounts.some((a) => a.channel === "messenger");

  const toggleAccount = (id: string) => {
    if (editing) {
      setSelectedAccountIds([id]);
      return;
    }
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((item) => item !== id) : prev) : [...prev, id],
    );
  };

  const handleFiles = async (files: FileList) => {
    setError(null);
    try {
      const remaining = Math.max(0, 10 - mediaUrls.length);
      const selected = Array.from(files).slice(0, remaining);
      const uploaded: string[] = [];
      for (const file of selected) {
        const result = await uploadMutation.mutateAsync(file);
        uploaded.push(result.publicUrl);
      }
      setMediaUrls((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const removeMedia = (url: string) => {
    setMediaUrls((current) => current.filter((item) => item !== url));
  };

  const handleSchedule = async (scheduledForIso: string) => {
    setError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          input: {
            caption: caption || undefined,
            mediaUrls,
            scheduledFor: scheduledForIso,
          },
        });
      } else {
        if (selectedAccountIds.length === 0) {
          throw new Error("Choose at least one connected channel to broadcast.");
        }
        // Broadcast across all selected accounts
        for (const targetAccountId of selectedAccountIds) {
          await createMutation.mutateAsync({
            accountId: targetAccountId,
            kind: mediaUrls.length > 1 ? "carousel" : mediaUrls.length === 1 ? "image" : "text",
            caption: caption || undefined,
            mediaUrls,
            scheduledFor: scheduledForIso,
          });
        }
        setCaption("");
        setMediaUrls([]);
      }
      setShowPicker(false);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule post");
    }
  };

  if (schedulable.length === 0) {
    return (
      <div className="rounded-[8px] border border-hairline bg-canvas-elevated p-4 text-[12.5px] text-body">
        Connect a Facebook Page or Instagram account in Settings to schedule posts.
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-3.5 shadow-2xs">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
          <span>📢</span>
          <span>{editing ? "Edit Scheduled Post" : "Broadcast & Schedule Post"}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
            showPreview
              ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
              : "border-hairline text-mute hover:text-ink hover:bg-surface-well"
          }`}
        >
          {showPreview ? "Hide Preview" : "👁 Live Preview"}
        </button>
      </div>

      {/* Target Channel Selector / Multi-select Broadcast */}
      <div className="mb-3">
        <label className="block text-[11px] font-medium text-mute mb-1.5">
          {editing ? "Target Channel" : "Select Broadcast Targets"}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {schedulable.map((account) => {
            const isSelected = selectedAccountIds.includes(account.id);
            return (
              <button
                key={account.id}
                type="button"
                onClick={() => toggleAccount(account.id)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 shadow-2xs"
                    : "border-hairline bg-canvas text-mute hover:text-ink hover:bg-surface-well"
                }`}
              >
                <ChannelIcon channel={account.channel} className="h-3.5 w-3.5" />
                <span className="truncate max-w-[130px]">{account.name}</span>
                {isSelected && <span className="text-[10px] text-indigo-500 font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <textarea
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        rows={4}
        placeholder="Write the post caption, hashtags (#brand #update), or links…"
        className="mb-2 w-full resize-none rounded-[6px] border border-hairline bg-canvas p-2.5 text-[13px] text-ink placeholder:text-mute focus:border-indigo-500 focus:outline-none"
      />

      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[6px] border border-hairline px-2.5 text-[11.5px] text-body transition-colors hover:bg-surface-well hover:text-ink">
            <input
              type="file"
              multiple
              className="hidden"
              accept="image/*,video/*"
              onChange={(event) => {
                const files = event.target.files;
                if (files?.length) void handleFiles(files);
                event.target.value = "";
              }}
            />
            {uploadMutation.isPending ? "Uploading…" : "📷 Add Media (Images/Video)"}
          </label>
          {mediaUrls.length > 0 && (
            <span className="font-mono text-[10.5px] text-mute">{mediaUrls.length}/10 attachments</span>
          )}
          {isNative && (
            <span className="font-mono text-[10px] text-mute">
              Facebook native queue (min 10m)
            </span>
          )}
        </div>
        {mediaUrls.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {mediaUrls.map((url) => (
              <li
                key={url}
                className="flex items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas px-2 py-1 text-[10.5px] text-body"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="attachment" className="h-4 w-4 rounded object-cover" />
                <span className="max-w-[130px] truncate">{url.split("/").pop()}</span>
                <button
                  type="button"
                  onClick={() => removeMedia(url)}
                  aria-label="Remove media"
                  className="cursor-pointer text-error font-bold hover:opacity-80"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Live Social Feed Preview */}
      {showPreview && (
        <div className="mb-3 rounded-lg border border-hairline bg-canvas p-3 shadow-inner">
          <div className="mb-2 flex items-center justify-between border-b border-hairline pb-2">
            <span className="text-[11px] font-semibold text-mute uppercase tracking-wider">Feed Preview</span>
            <div className="flex gap-1">
              {(["instagram", "messenger", "telegram", "discord"] as PreviewNetwork[]).map((net) => (
                <button
                  key={net}
                  type="button"
                  onClick={() => setPreviewTab(net)}
                  className={`px-2 py-0.5 rounded text-[10.5px] capitalize font-medium cursor-pointer transition-colors ${
                    previewTab === net
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-mute hover:text-ink hover:bg-surface-well"
                  }`}
                >
                  {net === "messenger" ? "Facebook" : net}
                </button>
              ))}
            </div>
          </div>

          {/* Social Network Card Simulation */}
          <div className="rounded border border-hairline/80 bg-canvas-elevated p-3 text-left">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold">
                {selectedAccounts[0]?.name?.[0]?.toUpperCase() || "C"}
              </div>
              <div>
                <div className="text-[12px] font-semibold text-ink leading-none">
                  {selectedAccounts[0]?.name || "ConnectMe"}
                </div>
                <div className="text-[10px] text-mute leading-none mt-0.5">
                  {previewTab === "instagram"
                    ? "@connectme · Sponsored"
                    : previewTab === "messenger"
                      ? "Just now · 🌐 Public"
                      : "Channel Broadcast"}
                </div>
              </div>
            </div>

            {/* Media Gallery / Single Image */}
            {mediaUrls.length > 0 && (
              <div className="mb-2 overflow-hidden rounded border border-hairline bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrls[0]}
                  alt="Post preview"
                  className="max-h-[220px] w-full object-cover"
                />
                {mediaUrls.length > 1 && (
                  <div className="bg-canvas-elevated/90 px-2 py-1 text-center text-[10px] font-mono text-mute">
                    1 of {mediaUrls.length} photos
                  </div>
                )}
              </div>
            )}

            {/* Caption & Hashtag parsing */}
            <p className="whitespace-pre-wrap text-[12px] text-ink leading-relaxed">
              {caption || <span className="italic text-mute">Caption text will appear here…</span>}
            </p>

            {/* Platform reaction bar mock */}
            <div className="mt-2.5 flex items-center justify-between border-t border-hairline/60 pt-2 text-[11px] text-mute">
              {previewTab === "instagram" && (
                <div className="flex items-center gap-3">
                  <span>❤️ Like</span>
                  <span>💬 Comment</span>
                  <span>↗️ Share</span>
                </div>
              )}
              {previewTab === "messenger" && (
                <div className="flex items-center gap-4">
                  <span>👍 Like</span>
                  <span>💬 Comment</span>
                  <span>↪️ Share</span>
                </div>
              )}
              {previewTab === "telegram" && (
                <div className="flex items-center gap-2">
                  <span className="rounded bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 text-sky-700 dark:text-sky-300 text-[10px]">
                    👍 12
                  </span>
                  <span className="rounded bg-indigo-100 dark:bg-indigo-950/60 px-1.5 py-0.5 text-indigo-700 dark:text-indigo-300 text-[10px]">
                    🔥 28
                  </span>
                </div>
              )}
              {previewTab === "discord" && (
                <div className="text-[10px] text-mute">Discord Webhook Embed</div>
              )}
              <span className="text-[10px] font-mono">Scheduled preview</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-2 rounded-[6px] border border-error/20 bg-error/10 px-2.5 py-1.5 text-[11.5px] text-error">
          {error}
        </div>
      )}

      {showPicker ? (
        <SchedulePicker
          title={editing ? "Reschedule post" : "Schedule post"}
          minLeadMinutes={isNative ? 10 : 1}
          maxDaysAhead={isNative ? 75 : 365}
          pending={pending}
          onCancel={() => setShowPicker(false)}
          onConfirm={handleSchedule}
        />
      ) : (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={pending || (!caption.trim() && mediaUrls.length === 0)}
            onClick={() => setShowPicker(true)}
            className="h-8 text-[12px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            {editing
              ? "Reschedule"
              : selectedAccountIds.length > 1
                ? `Broadcast to ${selectedAccountIds.length} Channels`
                : "Schedule Broadcast"}
          </Button>
          {editing && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-[11.5px] text-mute hover:text-ink cursor-pointer"
            >
              Cancel edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}