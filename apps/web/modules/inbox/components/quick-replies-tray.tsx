"use client";

interface QuickRepliesTrayProps {
  onSelect: (preset: string) => void;
}

const QUICK_REPLIES = [
  "Thanks for reaching out! How can I help you today?",
  "Could you share a screenshot or your order number?",
  "I've forwarded this to our team and will update you shortly.",
  "Is there anything else I can help with?",
];

export function QuickRepliesTray({ onSelect }: QuickRepliesTrayProps) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {QUICK_REPLIES.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onSelect(preset)}
          className="max-w-[22ch] truncate rounded-full border border-hairline bg-canvas-elevated px-2.5 py-1 text-[11.5px] text-body transition-colors hover:border-hairline-strong hover:text-ink active:bg-surface-well cursor-pointer"
          title={preset}
        >
          {preset}
        </button>
      ))}
    </div>
  );
}
