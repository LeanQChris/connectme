"use client";

import { memo, useState } from "react";

interface TagPickerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

const TAG_PRESETS = ["billing", "shipping", "technical", "vip", "refund"];

export const TagPicker = memo(function TagPicker({ tags, onChange }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const add = (tag: string) => {
    const clean = tag.trim().toLowerCase();
    if (!clean || tags.includes(clean)) return;
    onChange([...tags, clean]);
    setDraft("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 items-center gap-1 rounded-[6px] border border-hairline bg-canvas-elevated px-2 text-[12px] text-body shadow-2xs transition-colors hover:bg-surface-well hover:text-ink cursor-pointer"
      >
        <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M7 7h10l-1 12H8L7 7zm3-4h4"
          />
        </svg>
        <span className="font-mono text-[11px] tabular-nums">{tags.length || "Tags"}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close tag menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-9 z-20 w-56 rounded-[8px] border border-hairline bg-canvas-elevated p-2 shadow-lg">
            <div className="mb-1.5 flex flex-wrap gap-1">
              {tags.length === 0 && (
                <span className="px-1 py-0.5 text-[11px] text-mute">No tags</span>
              )}
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onChange(tags.filter((t) => t !== tag))}
                  title="Remove tag"
                  className="flex items-center gap-1 rounded-full bg-surface-well px-2 py-0.5 font-mono text-[10.5px] text-body transition-colors hover:text-error cursor-pointer"
                >
                  {tag}
                  <span aria-hidden>×</span>
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                add(draft);
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add tag…"
                className="h-7 w-full rounded-[6px] border border-hairline bg-canvas px-2 text-[12px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
              />
            </form>

            <div className="mt-1.5 flex flex-wrap gap-1">
              {TAG_PRESETS.filter((tag) => !tags.includes(tag)).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => add(tag)}
                  className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[10.5px] text-mute transition-colors hover:border-hairline-strong hover:text-ink cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
