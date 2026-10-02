"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MAX_UPLOAD_BYTES, type UploadedMedia } from "@/core/types";
import { inboxApi, type ReplyPayload } from "../api/inbox.api";

export type { ReplyPayload };

interface UseReplyBoxOptions {
  onSend: (payload: ReplyPayload) => Promise<void>;
  onNote?: (text: string) => Promise<void>;
  onSchedule?: (payload: ReplyPayload, scheduledForIso: string) => Promise<void>;
  disabled: boolean;
}

export function useReplyBox({ onSend, onNote, onSchedule, disabled }: UseReplyBoxOptions) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [schedulePending, setSchedulePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [attachment, setAttachment] = useState<UploadedMedia | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveMode: "reply" | "note" = disabled ? "note" : mode;
  const noteMode = effectiveMode === "note" && Boolean(onNote);
  const canSchedule = Boolean(onSchedule) && !noteMode;

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const insertEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setText((prev) => {
      const nextText = prev.substring(0, start) + emoji + prev.substring(end);
      return nextText;
    });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }, []);

  // Upload media using React Query mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => inboxApi.uploadMedia(file),
    onSuccess: (data, file) => {
      setAttachment({
        url: data.url,
        name: file.name,
        size: file.size,
        mimeType: data.mimeType || file.type,
        type: data.type,
      });
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Upload failed");
    },
  });

  const handleUpload = useCallback(
    (file: File) => {
      if (file.size > MAX_UPLOAD_BYTES) {
        setError(`File is too large (max ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB)`);
        return;
      }
      setError(null);
      uploadMutation.mutate(file);
    },
    [uploadMutation],
  );

  const submit = useCallback(async () => {
    const body = text.trim();
    if ((!body && !attachment) || pending || uploadMutation.isPending) return;

    setPending(true);
    setError(null);
    setShowEmojiPicker(false);
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
  }, [text, attachment, pending, uploadMutation.isPending, noteMode, onNote, onSend]);

  const schedule = useCallback(
    async (scheduledForIso: string) => {
      if (!onSchedule) return;
      const body = text.trim();
      if ((!body && !attachment) || schedulePending || uploadMutation.isPending) return;

      setSchedulePending(true);
      setError(null);
      setShowEmojiPicker(false);
      try {
        await onSchedule(
          attachment
            ? {
                text: body,
                mediaUrl: attachment.url,
                mimeType: attachment.mimeType,
                type: attachment.type,
              }
            : { text: body },
          scheduledForIso,
        );
        setText("");
        setAttachment(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      } catch (scheduleError) {
        setError(
          scheduleError instanceof Error ? scheduleError.message : "Failed to schedule message",
        );
      } finally {
        setSchedulePending(false);
      }
    },
    [text, attachment, schedulePending, uploadMutation.isPending, onSchedule],
  );

  return {
    text,
    setText,
    pending,
    schedulePending,
    error,
    setError,
    mode,
    setMode,
    noteMode,
    canSchedule,
    effectiveMode,
    attachment,
    setAttachment,
    uploading: uploadMutation.isPending,
    showEmojiPicker,
    setShowEmojiPicker,
    textareaRef,
    fileRef,
    insertEmoji,
    handleUpload,
    submit,
    schedule,
  };
}
