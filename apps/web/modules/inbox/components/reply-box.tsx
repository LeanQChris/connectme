"use client";

import { memo, useState } from "react";
import { MAX_UPLOAD_BYTES, type MessageType } from "@/core/types";
import { Button } from "@/components/ui/button";
import { SchedulePicker } from "@/modules/scheduling/components/schedule-picker";
import { useReplyBox } from "../hooks/use-reply-box";
import { EmojiPickerPopover } from "./emoji-picker-popover";
import { QuickRepliesTray } from "./quick-replies-tray";
import { AttachmentPreview } from "./attachment-preview";
import { AiCopilotBar } from "./ai-copilot-bar";
import { AiRewriteMenu } from "./ai-rewrite-menu";
import { WhatsAppTemplatePickerModal } from "./whatsapp-template-picker-modal";

export interface ReplyPayload {
  text: string;
  mediaUrl?: string | null;
  mimeType?: string;
  type?: MessageType;
}

interface ReplyBoxProps {
  onSend: (payload: ReplyPayload) => Promise<void>;
  onNote?: (text: string) => Promise<void>;
  onSchedule?: (payload: ReplyPayload, scheduledForIso: string) => Promise<void>;
  disabled: boolean;
  conversationId?: string;
  contactName?: string;
  channel?: string;
  lastMessages?: {
    direction: "in" | "out" | "note";
    text?: string | null;
    createdAt?: string;
  }[];
}

const QUICK_EMOJIS = ["👍", "❤️", "😊", "😂", "🙏", "🔥", "🎉", "✨", "🚀", "💯"];

const ReplyBox = memo(function ReplyBox({
  onSend,
  onNote,
  onSchedule,
  disabled,
  conversationId,
  contactName,
  channel,
  lastMessages,
}: ReplyBoxProps) {
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showAiRewrite, setShowAiRewrite] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const isWhatsApp = channel?.toLowerCase() === "whatsapp";

  const {
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
    attachment,
    setAttachment,
    uploading,
    showEmojiPicker,
    setShowEmojiPicker,
    textareaRef,
    fileRef,
    insertEmoji,
    handleUpload,
    submit,
    schedule,
  } = useReplyBox({ onSend, onNote, onSchedule, disabled });

  if (disabled && !onNote) {
    return (
      <div className="border-t border-hairline bg-canvas px-4 py-3">
        {conversationId && isWhatsApp && (
          <WhatsAppTemplatePickerModal
            conversationId={conversationId}
            contactName={contactName}
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-[12.5px] text-body">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⏳</span>
            <div>
              <span className="font-semibold text-ink block">
                24-Hour WhatsApp Reply Window Expired
              </span>
              <span className="text-mute text-[12px]">
                Meta requires sending an approved WhatsApp Template to reconnect with this customer.
              </span>
            </div>
          </div>
          {isWhatsApp && conversationId && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setShowTemplateModal(true)}
              className="h-8 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer shadow-xs"
            >
              📋 Send WhatsApp Template
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-t border-hairline bg-canvas p-3">
      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <EmojiPickerPopover
          onInsertEmoji={insertEmoji}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* Schedule Picker */}
      {showSchedulePicker && canSchedule && (
        <div className="mb-2.5">
          <SchedulePicker
            title="Schedule this reply"
            pending={schedulePending}
            onCancel={() => setShowSchedulePicker(false)}
            onConfirm={async (iso) => {
              await schedule(iso);
              setShowSchedulePicker(false);
            }}
          />
        </div>
      )}

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
            className="text-error hover:opacity-75 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* AI Copilot Suggestions Bar */}
      {!noteMode && (
        <AiCopilotBar
          conversationId={conversationId}
          contactName={contactName}
          channel={channel}
          lastMessages={lastMessages}
          onSelectSuggestion={(suggestion) => setText(suggestion)}
        />
      )}

      {/* Quick Replies Tray */}
      {!text && !noteMode && <QuickRepliesTray onSelect={setText} />}

      {/* Attachment Preview Card */}
      {attachment && (
        <AttachmentPreview attachment={attachment} onRemove={() => setAttachment(null)} />
      )}

      {/* Main Input Box */}
      <div
        className={`relative flex items-end gap-1.5 rounded-[8px] border bg-canvas-elevated p-1.5 shadow-2xs transition-colors ${
          noteMode ? "border-warning/60" : "border-hairline focus-within:border-ink"
        }`}
      >
        {/* AI Rewrite Menu */}
        {showAiRewrite && (
          <AiRewriteMenu
            text={text}
            onApply={(newText) => setText(newText)}
            onClose={() => setShowAiRewrite(false)}
          />
        )}

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleUpload(file);
            event.target.value = "";
          }}
        />

        {/* Attachment Button */}
        {!noteMode && (
          <button
            type="button"
            title={`Attach image, audio, video, or document (max ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB)`}
            aria-label="Attach a file"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-mute transition-colors hover:bg-surface-well hover:text-ink active:bg-surface-well disabled:opacity-40 cursor-pointer"
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

        {/* Emoji Popover Button */}
        {!noteMode && (
          <button
            type="button"
            title="Add emoji"
            aria-label="Add emoji"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-mute transition-colors hover:bg-surface-well hover:text-ink active:bg-surface-well cursor-pointer"
          >
            <span className="text-base leading-none">😀</span>
          </button>
        )}

        {/* WhatsApp Template Modal */}
        {conversationId && isWhatsApp && (
          <WhatsAppTemplatePickerModal
            conversationId={conversationId}
            contactName={contactName}
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
          />
        )}

        {/* AI Rewrite / Tone Button */}
        {!noteMode && (
          <button
            type="button"
            title="Rewrite or translate with AI"
            aria-label="AI Rewrite"
            onClick={() => setShowAiRewrite((prev) => !prev)}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] transition-colors cursor-pointer ${
              showAiRewrite
                ? "bg-violet-500/15 text-violet-600 dark:text-violet-400 font-bold"
                : text.trim().length > 0
                  ? "text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
                  : "text-mute hover:bg-surface-well hover:text-ink"
            }`}
          >
            <span className="text-sm">✨</span>
          </button>
        )}

        {/* WhatsApp Template Picker Button */}
        {isWhatsApp && conversationId && !noteMode && (
          <button
            type="button"
            title="Send an approved WhatsApp Template"
            aria-label="WhatsApp Template"
            onClick={() => setShowTemplateModal(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/10 active:bg-emerald-500/20 cursor-pointer"
          >
            <span className="text-sm">📋</span>
          </button>
        )}

        {/* Textarea */}
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
          className="max-h-36 min-h-[36px] flex-1 resize-none bg-transparent px-2.5 py-1.5 text-[14px] sm:text-[13px] text-ink placeholder:text-mute focus:outline-none leading-relaxed"
        />

        {/* Schedule Button */}
        {canSchedule && (
          <button
            type="button"
            title="Schedule this reply"
            aria-label="Schedule this reply"
            disabled={pending || schedulePending || uploading || (!text.trim() && !attachment)}
            onClick={() => setShowSchedulePicker((prev) => !prev)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-mute transition-colors hover:bg-surface-well hover:text-ink active:bg-surface-well disabled:opacity-40 cursor-pointer"
          >
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}

        {/* Send / Save Note Button */}
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={pending || schedulePending || uploading || (!text.trim() && !attachment)}
          className={`h-9 shrink-0 text-[12.5px] sm:text-[13px] font-medium ${
            noteMode
              ? "!bg-warning !text-ink hover:opacity-90"
              : ""
          }`}
          variant={noteMode ? "secondary" : "primary"}
        >
          {pending || uploading ? (
            <span>{uploading ? "Uploading…" : "Sending…"}</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span>{noteMode ? "Save Note" : "Send"}</span>
              {!noteMode && (
                <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </div>
          )}
        </Button>
      </div>

      {/* Footer bar: quick emojis and mode toggle */}
      <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[11px] text-mute">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {!noteMode && (
            <div className="flex items-center gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="rounded px-1 text-[13px] transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <span className="hidden sm:inline font-mono text-[10.5px] ml-1">
            Enter to {noteMode ? "save note" : "send"} · Shift+Enter for new line
          </span>
        </div>

        {onNote && (
          <button
            type="button"
            onClick={() => setMode(mode === "note" ? "reply" : "note")}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors shrink-0 cursor-pointer ${
              noteMode
                ? "border-warning/60 bg-warning/10 text-ink"
                : "border-hairline text-mute hover:text-ink"
            }`}
          >
            <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 3H8a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2z" />
            </svg>
            {noteMode ? "Note mode" : "Internal note"}
          </button>
        )}
      </div>
    </div>
  );
});

export default ReplyBox;