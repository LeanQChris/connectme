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
      setError(sendError instanceof Error ? sendError.message : "Could not send the message");
    } finally {
      setPending(false);
    }
  }

  if (disabled) {
    return (
      <div className="border-t border-hairline bg-surface-2/60 px-4 py-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 text-[12.5px] text-amber-500 font-medium">
          <svg className="h-4 w-4 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            The 24-hour reply window is closed. Free-form replies cannot be delivered until the customer sends a new message.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-hairline bg-surface/30 p-3 backdrop-blur-md">
      {error && (
        <div className="mb-2.5 flex items-center justify-between rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-[12px] text-red-500">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-2 rounded-xl border border-hairline bg-surface-2/80 p-1.5 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30 transition-all shadow-xs">
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
          placeholder="Type your reply here… (Press Enter ↵ to send)"
          className="max-h-36 min-h-[38px] flex-1 resize-none bg-transparent px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-muted leading-relaxed"
        />

        <button
          type="button"
          onClick={() => void submit()}
          disabled={pending || !text.trim()}
          className="flex h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-[13px] font-medium text-white shadow-xs transition-all hover:brightness-110 active:scale-98 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
        >
          {pending ? (
            <>
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
            </>
          ) : (
            <>
              <span>Send</span>
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </>
          )}
        </button>
      </div>
      <div className="mt-1 flex justify-between px-1 text-[10.5px] text-ink-muted">
        <span>Enter to send · Shift+Enter for new line</span>
      </div>
    </div>
  );
}