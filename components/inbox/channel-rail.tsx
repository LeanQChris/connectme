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
 * Provider dock: one 40px app-style tile per channel (plus All / Archived).
 * Idle = muted glyph on a hairline tile, active = brand-filled tile.
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
  function tileClass(item: Item, active: boolean) {
    if (!active) {
      return "border border-hairline bg-canvas-elevated text-mute hover:border-hairline-strong hover:bg-surface-well hover:text-ink";
    }
    return item.channel
      ? `${channelMeta(item.channel).tile} text-white shadow-[0_1px_2px_rgba(0,0,0,0.14)]`
      : "bg-ink text-on-primary shadow-[0_1px_2px_rgba(0,0,0,0.14)]";
  }

  function renderItem(item: Item) {
    const active = value === item.value;
    const n = item.value === ALL ? (counts.total ?? 0) : (counts[item.value] ?? 0);

    return (
      <button
        key={item.value || "all"}
        type="button"
        title={item.label}
        aria-label={item.label}
        aria-current={active}
        onClick={() => onChange(item.value)}
        className={`group relative flex h-10 w-10 items-center justify-center rounded-[10px] transition-all ${tileClass(
          item,
          active,
        )}`}
      >
        {item.channel ? (
          <ChannelIcon channel={item.channel} className="h-[19px] w-[19px]" />
        ) : (
          <svg
            className="h-[18px] w-[18px] stroke-current"
            fill="none"
            strokeWidth="1.6"
            viewBox="0 0 24 24"
            aria-hidden
          >
            {item.value === ARCHIVED ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7h18v3H3V7zm1 5h16v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7zm6 3h4"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 5h16v11H8l-4 4V5z"
              />
            )}
          </svg>
        )}

        {n > 0 && (
          <span
            className={`absolute -right-1 -bottom-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold tabular-nums shadow-[0_0_0_2px_var(--canvas)] ${
              active ? "bg-ink text-on-primary" : "bg-hairline-strong text-ink"
            }`}
          >
            {n > 99 ? "99+" : n}
          </span>
        )}
      </button>
    );
  }

  return (
    <nav
      aria-label="Providers"
      className="flex w-[60px] shrink-0 select-none flex-col items-center gap-1.5 border-r border-hairline bg-canvas py-3"
    >
      {ITEMS.map(renderItem)}

      <span aria-hidden className="my-1 h-px w-6 bg-hairline" />

      {renderItem({ value: ARCHIVED, label: "Archived" })}
    </nav>
  );
}

export { ARCHIVED };