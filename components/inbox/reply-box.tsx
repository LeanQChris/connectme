"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_UPLOAD_BYTES, type MessageType, type UploadedMedia, type Snippet } from "@/lib/types";
import { useSettings } from "@/lib/hooks/use-inbox";

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
  conversationId?: string | null;
}

const QUICK_REPLIES = [
  "Thanks for reaching out! How can I help you today?",
  "Could you share a screenshot or your order number?",
  "I've forwarded this to our team and will update you shortly.",
  "Is there anything else I can help with?",
];

const EMOJI_CATEGORIES = [
  {
    name: "Smiles & Gestures",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😎", "🤩", "🥳", "🤔", "🤫", "👍", "👎", "👏", "🙌", "🙏", "🤝", "✌️", "👋", "👌"],
  },
  {
    name: "Reactions & Love",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💖", "✨", "🔥", "💯", "🎉", "🎊", "⭐", "🌟", "💡", "🚀", "⚡", "🎯", "🏆", "🎁", "🎈", "🔔", "📢", "💬", "👀", "💪", "🌈", "✅"],
  },
  {
    name: "Symbols & Objects",
    emojis: ["📍", "📎", "📁", "📄", "📞", "📧", "💼", "💰", "💳", "🛒", "📦", "⏰", "⌛", "📅", "🔒", "🔑", "🔍", "📱", "💻", "🌐", "🛠️", "⚠️", "❓", "❗", "ℹ️", "🟢", "🔴", "🟡", "🔵", "✔️"],
  },
];

const QUICK_EMOJIS = ["👍", "❤️", "😊", "😂", "🙏", "🔥", "🎉", "✨", "🚀", "💯"];

export default function ReplyBox({ onSend, onNote, disabled, conversationId }: Props) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [attachment, setAttachment] = useState<UploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: settingsData } = useSettings();
  const templates = settingsData?.settings?.templates ?? [];

  // Snippets loaded once and refreshed after add/delete.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/snippets", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setSnippets(Array.isArray(d.snippets) ? d.snippets : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function refreshSnippets() {
    fetch("/api/snippets", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSnippets(Array.isArray(d.snippets) ? d.snippets : []))
      .catch(() => {});
  }

  // AI suggestion → composer draft.
  useEffect(() => {
    function onSuggest(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        setText((prev) => (prev.trim() ? `${prev}\n${detail}` : detail));
      }
    }
    window.addEventListener("ai:suggest", onSuggest);
    return () => window.removeEventListener("ai:suggest", onSuggest);
  }, []);

  // Typing presence: debounce ~2s, name from localStorage.
  useEffect(() => {
    if (!conversationId || !text.trim()) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      const name =
        typeof window !== "undefined"
          ? window.localStorage.getItem("connectme:agentName") || "Agent"
          : "Agent";
      void fetch("/api/typing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, name }),
      }).catch(() => {});
    }, 2000);
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [text, conversationId]);

  // Current "/token" being typed, if any.
  const slashMatch = text.match(/(?:^|\s)(\/[^\s]*)$/);
  const slashToken = slashMatch ? slashMatch[1].toLowerCase() : null;
  const snippetMatches = slashToken
    ? snippets.filter((s) => `/${s.shortcut.replace(/^\//, "").toLowerCase()}`.startsWith(slashToken) || s.shortcut.toLowerCase().startsWith(slashToken))
    : [];

  function insertSnippet(snippet: Snippet) {
    setText((prev) => prev.replace(/(?:^|\s)(\/[^\s]*)$/, (m) => (m.startsWith(" ") ? " " : "") + snippet.text));
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function deleteSnippet(id: string) {
    try {
      await fetch(`/api/snippets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setSnippets((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  }

  async function addSnippetFromDraft() {
    const body = text.trim();
    if (!body) return;
    const shortcut = window.prompt("Snippet shortcut (e.g. /thanks):");
    if (!shortcut || !shortcut.trim()) return;
    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shortcut: shortcut.trim(), text: body }),
      });
      if (res.ok) refreshSnippets();
    } catch {}
  }

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

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    setText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }

  async function upload(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`File is too large (max ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB)`);
      return;
    }
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
    <div className="relative border-t border-hairline bg-canvas p-3">
      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <>
          <button
            type="button"
            aria-label="Close emoji picker"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setShowEmojiPicker(false)}
          />
          <div className="absolute bottom-full left-0 sm:left-3 z-30 mb-2 w-[calc(100vw-24px)] sm:w-72 max-w-[320px] rounded-[10px] border border-hairline bg-canvas-elevated p-3 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-2 border-b border-hairline mb-2">
              <span className="text-[12px] font-semibold text-ink">Emojis</span>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                className="text-[12px] text-mute hover:text-ink"
              >
                ✕
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-3">
              {EMOJI_CATEGORIES.map((category) => (
                <div key={category.name}>
                  <p className="text-[10.5px] font-mono uppercase text-mute tracking-wider mb-1.5">
                    {category.name}
                  </p>
                  <div className="grid grid-cols-6 gap-1">
                    {category.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="flex h-8 w-8 items-center justify-center rounded-[6px] text-lg hover:bg-surface-well transition-transform hover:scale-110 active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
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
            className="text-error hover:opacity-75 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Replies Tray */}
      {QUICK_REPLIES.length > 0 && !text && !noteMode && (
        <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
          <span className="shrink-0 font-mono text-[10px] uppercase font-semibold text-mute tracking-wider pl-0.5">
            ⚡ Quick
          </span>
          {QUICK_REPLIES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setText(preset)}
              className="shrink-0 max-w-[28ch] truncate rounded-full border border-hairline bg-canvas-elevated px-3 py-1 text-[11.5px] text-body transition-all hover:border-hairline-strong hover:bg-surface-well hover:text-ink active:scale-95 shadow-2xs"
              title={preset}
            >
              {preset}
            </button>
          ))}
        </div>
      )}

      {/* Attachment Preview Card */}
      {attachment && (
        <div className="mb-2.5 flex items-center gap-2.5 rounded-[10px] border border-hairline bg-canvas-elevated p-2 text-[12px] shadow-2xs">
          {attachment.type === "image" ? (
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[8px] border border-hairline bg-surface-well">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={attachment.url} alt="Preview" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-hairline bg-surface-well text-ink">
              {attachment.type === "video" ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : attachment.type === "audio" ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-ink">{attachment.name}</p>
            <p className="font-mono text-[10.5px] text-mute">
              {(attachment.size / 1024).toFixed(0)} KB · <span className="uppercase">{attachment.type}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            aria-label="Remove attachment"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-mute transition-colors hover:bg-surface-well hover:text-ink"
          >
            ✕
          </button>
        </div>
      )}

      {/* Snippet suggestions for "/" tokens */}
      {snippetMatches.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 z-30 mb-1 max-h-48 overflow-y-auto rounded-[8px] border border-hairline bg-canvas-elevated p-1 shadow-lg">
          {snippetMatches.map((s) => (
            <div key={s.id} className="group flex items-center gap-2 rounded-[6px] px-2 py-1.5 hover:bg-surface-well">
              <button
                type="button"
                onClick={() => insertSnippet(s)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="font-mono text-[11.5px] text-ink">/{s.shortcut.replace(/^\//, "")}</span>
                <span className="ml-2 truncate text-[11.5px] text-mute">{s.text}</span>
              </button>
              <button
                type="button"
                aria-label="Delete snippet"
                onClick={() => void deleteSnippet(s.id)}
                className="shrink-0 rounded px-1 text-mute opacity-0 transition-opacity hover:bg-canvas hover:text-error group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Templates picker */}
      {showTemplates && templates.length > 0 && (
        <>
          <button
            type="button"
            aria-label="Close templates"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setShowTemplates(false)}
          />
          <div className="absolute bottom-full left-3 z-30 mb-1 max-h-48 w-72 overflow-y-auto rounded-[8px] border border-hairline bg-canvas-elevated p-1 shadow-lg">
            {templates.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setText((prev) => (prev.trim() ? `${prev}\n${t}` : t));
                  setShowTemplates(false);
                }}
                className="block w-full truncate rounded-[6px] px-2 py-1.5 text-left text-[12px] text-body hover:bg-surface-well hover:text-ink"
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Main Input Box */}
      <div
        className={`flex items-end gap-1.5 rounded-[12px] border bg-canvas-elevated p-1.5 shadow-2xs transition-all ${
          noteMode ? "border-amber-500/60 ring-1 ring-amber-500/20" : "border-hairline focus-within:border-ink/50 focus-within:ring-1 focus-within:ring-ink/20"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-mute transition-colors hover:bg-surface-well hover:text-ink active:bg-surface-well disabled:opacity-40"
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-mute transition-colors hover:bg-surface-well hover:text-ink active:bg-surface-well"
          >
            <span className="text-base leading-none">😀</span>
          </button>
        )}

        {/* Templates + Snippet manage buttons */}
        {!noteMode && templates.length > 0 && (
          <button
            type="button"
            title="Insert template"
            aria-label="Insert template"
            onClick={() => setShowTemplates((v) => !v)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] font-mono text-[13px] text-mute transition-colors hover:bg-surface-well hover:text-ink active:bg-surface-well"
          >
            T
          </button>
        )}
        {!noteMode && (
          <button
            type="button"
            title="Save current draft as snippet"
            aria-label="Save current draft as snippet"
            onClick={() => void addSnippetFromDraft()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] font-mono text-[13px] text-mute transition-colors hover:bg-surface-well hover:text-ink active:bg-surface-well"
          >
            /+
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

        {/* Send Button */}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={pending || uploading || (!text.trim() && !attachment)}
          className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[8px] px-3.5 text-[12.5px] sm:text-[13px] font-medium transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 shadow-2xs ${
            noteMode ? "bg-amber-500 text-neutral-950 font-semibold" : "bg-primary text-on-primary"
          }`}
        >
          {pending || uploading ? (
            <span>{uploading ? "Uploading…" : "Sending…"}</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span>{noteMode ? "Save Note" : "Send"}</span>
              {!noteMode && (
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Footer bar: quick emojis and mode toggle */}
      <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-mute select-none">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {!noteMode && (
            <div className="flex items-center gap-0.5">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmoji(emoji)}
                  className="rounded px-1.5 py-0.5 text-[13px] transition-transform hover:scale-125 active:scale-95 hover:bg-surface-well"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <span className="hidden sm:inline font-mono text-[10.5px] text-mute ml-1 opacity-80">
            ↵ to {noteMode ? "save note" : "send"} · Shift+↵ for new line
          </span>
        </div>

        {onNote && (
          <button
            type="button"
            onClick={() => setMode(mode === "note" ? "reply" : "note")}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors shrink-0 shadow-2xs ${
              noteMode
                ? "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-hairline text-mute hover:border-hairline-strong hover:text-ink"
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
}