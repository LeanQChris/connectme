"use client";

import { CHANNELS, type Channel } from "@/lib/types";

import { ChannelIcon, channelMeta } from "./channel-badge";

const ALL = "";
const ARCHIVED = "archived";

type Item = { value: string; label: string; channel?: Channel };

const ITEMS: Item[] = [
  { value: ALL, label: "All" },
  ...CHANNELS.map((channel) => ({ value: channel, label: channelMeta(channel).label, channel })),
];

/**
 * 52px vertical rail: one icon per provider (plus All / Archived).
 * Replaces the old horizontal pill row so filtering never wraps or scrolls away.
 */
export default function ChannelRail({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (value: string) => void;
  counts: Record<string, number>;
}) {
  function count(item: Item) {
    return item.value === ALL ? counts.total : counts[item.value];
  }

  function renderItem(item: Item) {
    const active = value === item.value;
    const n = count(item) ?? 0;
    return (
      <button
        key={item.value || "all"}
        type="button"
        title={item.label}
        aria-label={item.label}
        aria-current={active}
        onClick={() => onChange(item.value)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors ${
          active
            ? `bg-canvas-elevated shadow-[inset_2px_0_0_var(--ink)] ${
                item.channel ? channelMeta(item.channel).text : "text-ink"
              }`
            : "text-mute hover:bg-surface-well hover:text-ink"
        }`}
      >
        {item.channel ? (
          <ChannelIcon channel={item.channel} />
        ) : (
          <svg className="h-[18px] w-[18px] stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M3 13h4l2 3h6l2-3h4M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
            />
          </svg>
        )}

        {n > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold tabular-nums text-on-primary">
            {n > 99 ? "99+" : n}
          </span>
        )}
      </button>
    );
  }

  return (
    <nav
      aria-label="Providers"
      className="flex w-[52px] shrink-0 select-none flex-col items-center gap-1 border-r border-hairline bg-canvas py-2"
    >
      {ITEMS.map(renderItem)}

      <span aria-hidden className="my-1 h-px w-5 bg-hairline" />

      {renderItem({ value: ARCHIVED, label: "Archived" })}
    </nav>
  );
}

export { ARCHIVED };