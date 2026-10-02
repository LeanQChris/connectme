"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onSend: (text: string) => Promise<void>;
  disabled: boolean;
}

export default function ReplyBox({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  async function submit() {
    const body = text.trim();
    if (!body || pending) return;

    setPending(true);
    setError(null);
    try {
      await onSend(body);
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message");
    } finally {
      setPending(false);
    }
  }

  if (disabled) {
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

      <div className="relative flex items-end gap-2 rounded-[6px] border border-hairline bg-canvas-elevated p-1.5 focus-within:border-ink transition-colors shadow-2xs">
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
          placeholder="Write a reply… (Press Enter to send)"
          className="max-h-36 min-h-[36px] flex-1 resize-none bg-transparent px-2.5 py-1.5 text-[13px] text-ink placeholder:text-mute focus:outline-none leading-relaxed"
        />

        <button
          type="button"
          onClick={() => void submit()}
          disabled={pending || !text.trim()}
          className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[6px] bg-primary px-3.5 text-[13px] font-medium text-on-primary transition-opacity hover:opacity-90 active:opacity-95 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {pending ? (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Sending</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span>Send</span>
              <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
          )}
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-mute">
        <span className="font-mono text-[10.5px]">Enter to send · Shift + Enter for new line</span>
      </div>
    </div>
  );
}