"use client";

import { useMemo, useState } from "react";
import type { ScheduledPost } from "../data/scheduling.types";

interface ScheduledCalendarProps {
  posts: ScheduledPost[];
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function ScheduledCalendar({ posts }: ScheduledCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string>(dayKey(today));

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const post of posts) {
      const key = dayKey(new Date(post.scheduledFor));
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [posts]);

  const viewDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [today, monthOffset]);

  const cells = useMemo(() => {
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const leading = firstDay.getDay();
    const result: Array<Date | null> = [];
    for (let i = 0; i < leading; i += 1) result.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
    }
    return result;
  }, [viewDate]);

  const selectedPosts = byDay.get(selectedKey) ?? [];

  return (
    <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-3 shadow-2xs">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m - 1)}
          className="rounded-[6px] border border-hairline px-2 py-0.5 text-[12px] text-body hover:bg-surface-well cursor-pointer"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-[12.5px] font-semibold text-ink">
          {viewDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => setMonthOffset((m) => m + 1)}
          className="rounded-[6px] border border-hairline px-2 py-0.5 text-[12px] text-body hover:bg-surface-well cursor-pointer"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="font-mono text-[9.5px] uppercase text-mute">
            {day}
          </span>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const key = dayKey(date);
          const count = byDay.get(key)?.length ?? 0;
          const isSelected = key === selectedKey;
          const isToday = key === dayKey(today);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
              className={`relative flex h-8 items-center justify-center rounded-[6px] text-[11.5px] transition-colors cursor-pointer ${
                isSelected
                  ? "bg-primary text-on-primary"
                  : "text-body hover:bg-surface-well hover:text-ink"
              } ${isToday && !isSelected ? "border border-hairline-strong" : ""}`}
            >
              {date.getDate()}
              {count > 0 && (
                <span
                  className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                    isSelected ? "bg-on-primary" : "bg-warning"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-hairline pt-2">
        {selectedPosts.length === 0 ? (
          <p className="py-2 text-center text-[11.5px] text-mute">Nothing scheduled this day.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {selectedPosts.map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-[12px] text-ink">
                  {post.caption || "(no caption)"}
                </span>
                <span className="shrink-0 font-mono text-[10.5px] text-mute">
                  {new Date(post.scheduledFor).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}