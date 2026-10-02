"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_UPLOAD_BYTES, type MessageType, type UploadedMedia } from "@/lib/types";

export interface ReplyPayload {
  text: string;
  mediaUrl?: string | null;
  mimeType?: string;
  type?: MessageType;
}

interface Props {
  onSend: (payload: ReplyPayload) => Promise<void>;
  onNote?: (text: string) => Promise<void>;
  disabled: boolean;
}

const QUICK_REPLIES = [
  "Thanks for reaching out! How can I help you today?",
  "Could you share a screenshot or your order number?",
  "I've forwarded this to our team and will update you shortly.",
  "Is there anything else I can help with?",
];

export default function ReplyBox({ onSend, onNote, disabled }: Props) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [attachment, setAttachment] = useState<UploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Notes are internal, so they stay available even when the window is closed.
  const effectiveMode: "reply" | "note" = disabled ? "note" : mode;
  const noteMode = effectiveMode === "note" && Boolean(onNote);

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/media", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setAttachment(data as UploadedMedia);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    const body = text.trim();
    if ((!body && !attachment) || pending || uploading) return;

    setPending(true);
    setError(null);
    try {
      if (noteMode) {
        await onNote!(body);
      } else {
        await onSend(
          attachment
            ? {
                text: body,
                mediaUrl: attachment.url,
                mimeType: attachment.mimeType,
                type: attachment.type,
              }
            : { text: body },
        );
      }
      setText("");
      setAttachment(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setPending(false);
    }
  }

  if (disabled && !onNote) {
    return (
      <div className="border-t border-hairline bg-canvas px-4 py-3">
        <div className="flex items-center gap-2 text-[12px] text-warning font-medium">
          <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            24-hour reply window expired. Meta policy requires the customer to message first before you can send free-form replies.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-hairline bg-canvas p-3">
      {disabled && (
        <div className="mb-2.5 flex items-center gap-2 rounded-[6px] border border-warning/30 bg-warning/10 px-3 py-2 text-[11.5px] text-body">
          <span>Reply window closed — internal notes still work.</span>
        </div>
      )}

      {error && (
        <div className="mb-2.5 flex items-center justify-between rounded-[6px] border border-error/20 bg-error/10 px-3 py-2 text-[12px] text-error font-medium">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-error hover:opacity-75 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {QUICK_REPLIES.length > 0 && !text && !noteMode && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_REPLIES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setText(preset)}
              className="max-w-[22ch] truncate rounded-full border border-hairline bg-canvas-elevated px-2.5 py-1 text-[11.5px] text-body transition-colors hover:border-hairline-strong hover:text-ink"
              title={preset}
            >
              {preset}
            </button>
          ))}
        </div>
      )}

      {attachment && (
        <div className="mb-2 flex items-center gap-2 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 py-1.5 text-[12px]">
          <svg className="h-3.5 w-3.5 shrink-0 text-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
            />
          </svg>
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">{attachment.name}</span>
          <span className="font-mono text-[10px] text-mute">
            {(attachment.size / 1024).toFixed(0)} KB
          </span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            aria-label="Remove attachment"
            className="text-mute transition-colors hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}

      <div
        className={`flex items-end gap-2 rounded-[6px] border bg-canvas-elevated p-1.5 shadow-2xs transition-colors ${
          noteMode ? "border-warning/60" : "border-hairline focus-within:border-ink"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,audio/*,video/*,.pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />

        {!noteMode && (
          <button
            type="button"
            title={`Attach a file (max ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB)`}
            aria-label="Attach a file"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-mute transition-colors hover:bg-surface-well hover:text-ink disabled:opacity-40"
          >
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M21.44 11.05l-9.19 9.19a5.5 5.5 0 01-7.78-7.78l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.49"
              />
            </svg>
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          rows={1}
          placeholder={
            noteMode
              ? "Write an internal note…"
              : "Write a reply… (Press Enter to send)"
          }
          className="max-h-36 min-h-[36px] flex-1 resize-none bg-transparent px-2.5 py-1.5 text-[13px] text-ink placeholder:text-mute focus:outline-none leading-relaxed"
        />

        <button
          type="button"
          onClick={() => void submit()}
          disabled={pending || uploading || (!text.trim() && !attachment)}
          className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[6px] px-3.5 text-[13px] font-medium transition-opacity hover:opacity-90 active:opacity-95 disabled:cursor-not-allowed disabled:opacity-30 ${
            noteMode ? "bg-warning text-ink" : "bg-primary text-on-primary"
          }`}
        >
          {pending || uploading ? (
            <span>{uploading ? "Uploading" : "Sending"}</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span>{noteMode ? "Note" : "Send"}</span>
              {!noteMode && (
                <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </div>
          )}
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[11px] text-mute">
        <span className="font-mono text-[10.5px]">
          Enter to {noteMode ? "save note" : "send"} · Shift + Enter for new line
        </span>
        {onNote && (
          <button
            type="button"
            onClick={() => setMode(mode === "note" ? "reply" : "note")}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
              noteMode
                ? "border-warning/60 bg-warning/10 text-ink"
                : "border-hairline text-mute hover:text-ink"
            }`}
          >
            <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 3H8a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2z" />
            </svg>
            {noteMode ? "Note mode" : "Add note"}
          </button>
        )}
      </div>
    </div>
  );
}