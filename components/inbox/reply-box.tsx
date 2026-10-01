"use client";

import { useState } from "react";

interface Props {
  onSend: (text: string) => Promise<void>;
  disabled: boolean;
}

export default function ReplyBox({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const body = text.trim();
    if (!body || pending) return;

    setPending(true);
    setError(null);
    try {
      await onSend(body);
      setText("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send the message");
    } finally {
      setPending(false);
    }
  }

  if (disabled) {
    return (
      <div className="border-t border-hairline bg-surface px-4 py-3">
        <p className="text-[13px] text-ink-secondary">
          The 24-hour window is closed. WhatsApp needs an approved template message to reach this
          customer now.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-hairline px-3 py-2.5">
      {error ? (
        <p role="alert" className="mb-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter inserts a newline.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          rows={1}
          placeholder="Write a reply…"
          className="max-h-32 min-h-[36px] flex-1 resize-y rounded-md border border-hairline-strong bg-bg px-2.5 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-ink-muted"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={pending || !text.trim()}
          className="h-[36px] shrink-0 rounded-md bg-ink px-3.5 text-[13px] font-medium text-bg transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}