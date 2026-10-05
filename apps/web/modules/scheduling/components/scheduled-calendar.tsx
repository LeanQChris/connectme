"use client";

import { useMemo, useState } from "react";
import { ChannelIcon } from "@/components/ui/channel-badge";
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
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [monthOffset, setMonthOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
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
    return new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  }, [today, monthOffset]);

  const monthCells = useMemo(() => {
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

  const currentWeekDays = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [today, weekOffset]);

  const selectedPosts = byDay.get(selectedKey) ?? [];

  return (
    <div className="rounded-[10px] border border-hairline bg-canvas-elevated p-3.5 shadow-2xs">
      <div className="mb-3 flex items-center justify-between border-b border-hairline pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">📅 Scheduled Calendar</span>
          <div className="flex rounded-md border border-hairline bg-canvas p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setCalendarView("month")}
              className={`rounded px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                calendarView === "month"
                  ? "bg-indigo-600 text-white"
                  : "text-mute hover:text-ink"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setCalendarView("week")}
              className={`rounded px-2 py-0.5 font-medium transition-colors cursor-pointer ${
                calendarView === "week"
                  ? "bg-indigo-600 text-white"
                  : "text-mute hover:text-ink"
              }`}
            >
              Week
            </button>
          </div>
        </div>

        {/* Month/Week Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (calendarView === "month") setMonthOffset((m) => m - 1);
              else setWeekOffset((w) => w - 1);
            }}
            className="rounded-[6px] border border-hairline px-2 py-0.5 text-[12px] text-body hover:bg-surface-well cursor-pointer"
            aria-label="Previous"
          >
            ‹
          </button>
          <span className="text-[12px] font-medium text-ink min-w-[110px] text-center">
            {calendarView === "month"
              ? viewDate.toLocaleString(undefined, { month: "short", year: "numeric" })
              : `Week of ${currentWeekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
          </span>
          <button
            type="button"
            onClick={() => {
              if (calendarView === "month") setMonthOffset((m) => m + 1);
              else setWeekOffset((w) => w + 1);
            }}
            className="rounded-[6px] border border-hairline px-2 py-0.5 text-[12px] text-body hover:bg-surface-well cursor-pointer"
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

      {calendarView === "month" ? (
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((day) => (
            <span key={day} className="font-mono text-[9.5px] uppercase text-mute">
              {day}
            </span>
          ))}
          {monthCells.map((date, index) => {
            if (!date) return <span key={`empty-${index}`} />;
            const key = dayKey(date);
            const dayPosts = byDay.get(key) ?? [];
            const count = dayPosts.length;
            const isSelected = key === selectedKey;
            const isToday = key === dayKey(today);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={`relative flex h-9 flex-col items-center justify-center rounded-[6px] text-[11.5px] transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "text-body hover:bg-surface-well hover:text-ink"
                } ${isToday && !isSelected ? "border border-indigo-400 font-bold" : ""}`}
              >
                <span>{date.getDate()}</span>
                {count > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayPosts.slice(0, 3).map((p, idx) => (
                      <span
                        key={idx}
                        className={`h-1 w-1 rounded-full ${
                          isSelected
                            ? "bg-white"
                            : p.status === "failed"
                              ? "bg-red-500"
                              : p.status === "published"
                                ? "bg-emerald-500"
                                : "bg-indigo-500"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        /* Week View Grid */
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {currentWeekDays.map((date) => {
            const key = dayKey(date);
            const dayPosts = byDay.get(key) ?? [];
            const isSelected = key === selectedKey;
            const isToday = key === dayKey(today);
            return (
              <div
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`flex flex-col min-h-[120px] rounded-lg border p-1.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20"
                    : "border-hairline bg-canvas hover:bg-surface-well"
                }`}
              >
                <div className="flex items-center justify-between border-b border-hairline/60 pb-1 mb-1">
                  <span className="font-mono text-[9px] uppercase text-mute">
                    {date.toLocaleString(undefined, { weekday: "narrow" })}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      isToday ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-ink"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>
                <div className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
                  {dayPosts.map((post) => (
                    <div
                      key={post.id}
                      className="rounded bg-canvas-elevated p-1 text-[10px] border border-hairline shadow-2xs"
                    >
                      <div className="flex items-center gap-1 font-semibold text-ink">
                        <ChannelIcon channel={post.channel} className="h-2.5 w-2.5" />
                        <span className="truncate">{new Date(post.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="line-clamp-2 text-mute mt-0.5">{post.caption || "(no text)"}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Day's Scheduled Posts Inspector */}
      <div className="mt-3 border-t border-hairline pt-3">
        <div className="mb-2 flex items-center justify-between text-[11.5px] font-medium text-mute">
          <span>Scheduled on {selectedKey}</span>
          <span className="font-mono text-[10.5px]">{selectedPosts.length} posts</span>
        </div>

        {selectedPosts.length === 0 ? (
          <p className="py-2.5 text-center text-[12px] text-mute italic">No posts queued for this date.</p>
        ) : (
          <div className="space-y-2">
            {selectedPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-2.5 rounded-lg border border-hairline bg-canvas p-2.5 transition-colors hover:border-hairline-strong"
              >
                {post.mediaUrls.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.mediaUrls[0]}
                    alt="media"
                    className="h-10 w-10 shrink-0 rounded object-cover border border-hairline"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-well border border-hairline text-[14px]">
                    📝
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <ChannelIcon channel={post.channel} className="h-3 w-3" />
                    <span className="font-medium text-[12px] text-ink capitalize">
                      {post.channel} · {post.kind}
                    </span>
                    <span
                      className={`ml-auto rounded-full px-1.5 py-0.2 text-[9.5px] font-semibold uppercase ${
                        post.status === "published"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : post.status === "failed"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-mute line-clamp-1">
                    {post.caption || "(no caption text)"}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-mute">
                    <span>
                      ⏰{" "}
                      {new Date(post.scheduledFor).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {post.mediaUrls.length > 1 && (
                      <span>🖼 {post.mediaUrls.length} files</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}