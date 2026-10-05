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
    <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 select-none">
      <span className="shrink-0 font-mono text-[10px] uppercase font-semibold text-mute tracking-wider pl-0.5">
        ⚡ Quick
      </span>
      {QUICK_REPLIES.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onSelect(preset)}
          className="shrink-0 max-w-[28ch] truncate rounded-full border border-hairline bg-canvas-elevated px-3 py-1 text-[11.5px] text-body transition-all hover:border-hairline-strong hover:bg-surface-well hover:text-ink active:scale-95 shadow-2xs cursor-pointer"
          title={preset}
        >
          {preset}
        </button>
      ))}
    </div>
  );
}
