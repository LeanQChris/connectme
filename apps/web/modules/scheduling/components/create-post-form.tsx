"use client";

import { useMemo, useState } from "react";
import type { ConnectedAccount } from "@/core/types";
import { Button } from "@/components/ui/button";
import { isPostSchedulable, type ScheduledPost } from "../data/scheduling.types";
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
  const schedulable = useMemo(() => accounts.filter((a) => isPostSchedulable(a.channel)), [accounts]);

  const [accountId, setAccountId] = useState(editing?.accountId ?? schedulable[0]?.id ?? "");
  const [caption, setCaption] = useState(editing?.caption ?? "");
  const [mediaUrl, setMediaUrl] = useState<string | null>(editing?.mediaUrls?.[0] ?? null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadPostMedia();
  const createMutation = useCreateScheduledPost();
  const updateMutation = useUpdateScheduledPost();
  const pending = createMutation.isPending || updateMutation.isPending || uploadMutation.isPending;

  const selectedAccount = schedulable.find((a) => a.id === accountId);
  const isNative = selectedAccount?.channel === "messenger";

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const result = await uploadMutation.mutateAsync(file);
      setMediaUrl(result.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleSchedule = async (scheduledForIso: string) => {
    setError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          input: {
            caption: caption || undefined,
            mediaUrls: mediaUrl ? [mediaUrl] : [],
            scheduledFor: scheduledForIso,
          },
        });
      } else {
        if (!accountId) throw new Error("Choose a connected Page or Instagram account.");
        await createMutation.mutateAsync({
          accountId,
          kind: mediaUrl ? "image" : "text",
          caption: caption || undefined,
          mediaUrls: mediaUrl ? [mediaUrl] : [],
          scheduledFor: scheduledForIso,
        });
        setCaption("");
        setMediaUrl(null);
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
              {account.channel === "messenger" ? "Facebook Page" : "Instagram"} · {account.name}
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

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[6px] border border-hairline px-2.5 text-[11.5px] text-body transition-colors hover:bg-surface-well hover:text-ink">
          <input
            type="file"
            className="hidden"
            accept="image/*,video/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
          {uploadMutation.isPending ? "Uploading…" : mediaUrl ? "Replace media" : "Add media"}
        </label>
        {mediaUrl && (
          <button
            type="button"
            onClick={() => setMediaUrl(null)}
            className="text-[11px] text-error hover:opacity-80 cursor-pointer"
          >
            Remove media
          </button>
        )}
        {isNative && (
          <span className="font-mono text-[10px] text-mute">
            Facebook native · min 10 min lead
          </span>
        )}
        {!isNative && selectedAccount?.channel === "instagram" && (
          <span className="font-mono text-[10px] text-mute">Instagram · media required</span>
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
            disabled={pending || (!caption.trim() && !mediaUrl)}
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