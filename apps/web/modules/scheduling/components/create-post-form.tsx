"use client";

import { useMemo, useState } from "react";
import type { ConnectedAccount } from "@/core/types";
import { Button } from "@/components/ui/button";
import {
  isPostSchedulable,
  POST_CHANNEL_LABELS,
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

export function CreatePostForm({
  accounts,
  editing,
  onDone,
  onCancelEdit,
}: CreatePostFormProps) {
  const schedulable = useMemo(() => accounts.filter((a) => isPostSchedulable(a)), [accounts]);

  const [accountId, setAccountId] = useState(editing?.accountId ?? schedulable[0]?.id ?? "");
  const [caption, setCaption] = useState(editing?.caption ?? "");
  const [mediaUrls, setMediaUrls] = useState<string[]>(editing?.mediaUrls ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadPostMedia();
  const createMutation = useCreateScheduledPost();
  const updateMutation = useUpdateScheduledPost();
  const pending = createMutation.isPending || updateMutation.isPending || uploadMutation.isPending;

  const selectedAccount = schedulable.find((a) => a.id === accountId);
  const isNative = selectedAccount?.channel === "messenger";

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
        if (!accountId) throw new Error("Choose a connected Page or Instagram account.");
        await createMutation.mutateAsync({
          accountId,
          kind: mediaUrls.length > 1 ? "carousel" : mediaUrls.length === 1 ? "image" : "text",
          caption: caption || undefined,
          mediaUrls,
          scheduledFor: scheduledForIso,
        });
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
    <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-3 shadow-2xs">
      <div className="mb-2 text-[12px] font-semibold text-ink">
        {editing ? "Edit scheduled post" : "Schedule a post"}
      </div>

      {!editing && (
        <select
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className="mb-2 w-full rounded-[6px] border border-hairline bg-canvas px-2.5 py-1.5 text-[12.5px] text-ink focus:border-ink focus:outline-none"
        >
          {schedulable.map((account) => (
            <option key={account.id} value={account.id}>
              {POST_CHANNEL_LABELS[account.channel] ?? account.channel} · {account.name}
            </option>
          ))}
        </select>
      )}

      <textarea
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        rows={3}
        placeholder="Write the caption…"
        className="mb-2 w-full resize-none rounded-[6px] border border-hairline bg-canvas px-2.5 py-2 text-[13px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
      />

      <div className="mb-2">
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
            {uploadMutation.isPending ? "Uploading…" : "Add media"}
          </label>
          {mediaUrls.length > 0 && (
            <span className="font-mono text-[10px] text-mute">{mediaUrls.length}/10</span>
          )}
          {isNative && (
            <span className="font-mono text-[10px] text-mute">
              Facebook native · min 10 min lead
            </span>
          )}
          {!isNative && selectedAccount?.channel === "instagram" && (
            <span className="font-mono text-[10px] text-mute">
              Instagram · 2+ media becomes a carousel
            </span>
          )}
        </div>
        {mediaUrls.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {mediaUrls.map((url) => (
              <li
                key={url}
                className="flex items-center gap-1 rounded-[6px] border border-hairline bg-canvas px-2 py-1 text-[10.5px] text-body"
              >
                <span className="max-w-[160px] truncate">{url.split("/").pop()}</span>
                <button
                  type="button"
                  onClick={() => removeMedia(url)}
                  aria-label="Remove media"
                  className="cursor-pointer text-error hover:opacity-80"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
            className="h-8 text-[12px]"
          >
            {editing ? "Reschedule" : "Schedule post"}
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