"use client";

import { useState } from "react";
import SiteHeader from "@/components/layout/site-header";
import { cn } from "@/core/utils/cn";
import { useDashboardStats } from "./hooks/use-dashboard";
import {
  DASHBOARD_WINDOW_OPTIONS,
  formatDuration,
  type DashboardWindow,
} from "./data/dashboard.types";
import { StatTile } from "./components/stat-tile";
import { VolumeChart } from "./components/volume-chart";
import { ChannelBreakdownCard } from "./components/channel-breakdown-card";
import { QueueHealthCard } from "./components/queue-health-card";
import { AttentionList } from "./components/attention-list";

export default function DashboardModule() {
  const [days, setDays] = useState<DashboardWindow>(14);
  const { data, isLoading, isError, refetch, isFetching } = useDashboardStats(days);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Dashboard</h1>
            <p className="mt-0.5 text-[12.5px] text-mute">
              Inbox load, reply-window pressure and queue health across every connected channel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isFetching && !isLoading && (
              <span className="font-mono text-[10.5px] text-faint">refreshing…</span>
            )}
            <div className="flex items-center gap-1 rounded-[6px] border border-hairline bg-canvas-elevated p-0.5 shadow-2xs">
              {DASHBOARD_WINDOW_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDays(option)}
                  className={cn(
                    "cursor-pointer rounded-[4px] px-2 py-1 font-mono text-[11px] transition-colors",
                    days === option
                      ? "bg-primary text-on-primary"
                      : "text-mute hover:text-ink",
                  )}
                >
                  {option}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {isError ? (
          <div className="rounded-xl border border-error/30 bg-error/5 p-6 text-center">
            <p className="text-[13px] text-ink">Could not load dashboard stats.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 cursor-pointer rounded-[6px] border border-hairline bg-canvas-elevated px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-surface-well"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-[104px] animate-pulse rounded-xl border border-hairline bg-canvas-elevated"
              />
            ))}
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Open"
                value={String(data.totals.openConversations)}
                hint="Conversations awaiting a reply"
                href="/inbox"
              />
              <StatTile
                label="Unread"
                value={String(data.totals.unreadMessages)}
                hint="Inbound messages not yet read"
                tone={data.totals.unreadMessages > 0 ? "warning" : "default"}
                href="/inbox"
              />
              <StatTile
                label="Needs attention"
                value={String(data.totals.needsAttention)}
                hint="Open with unread messages"
                tone={data.totals.needsAttention > 0 ? "warning" : "default"}
              />
              <StatTile
                label="Window closing"
                value={String(data.totals.replyWindowClosing)}
                hint="Under 2h of free-form reply left"
                tone={data.totals.replyWindowClosing > 0 ? "error" : "default"}
              />
              <StatTile
                label="First response"
                value={formatDuration(data.totals.avgFirstResponseMs)}
                hint={`Average over ${data.windowDays} days`}
              />
              <StatTile
                label="Scheduled"
                value={String(data.totals.scheduledUpcoming)}
                hint="Posts and replies in the queue"
                href="/scheduled"
              />
              <StatTile
                label="Queue failures"
                value={String(data.totals.scheduledFailed)}
                hint="Failed publishes and sends"
                tone={data.totals.scheduledFailed > 0 ? "error" : "default"}
                href="/scheduled"
              />
              <StatTile
                label="Total threads"
                value={String(data.byStatus.reduce((sum, row) => sum + row.count, 0))}
                hint="All time"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <VolumeChart volume={data.volume} windowDays={data.windowDays} />
              <ChannelBreakdownCard byChannel={data.byChannel} byStatus={data.byStatus} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <AttentionList items={data.needsAttention} now={new Date(data.generatedAt).getTime()} />
              <QueueHealthCard
                posts={data.scheduledPosts}
                messages={data.scheduledMessages}
              />
            </div>

            <p className="text-center text-[11px] text-faint">
              Updated{" "}
              {new Date(data.generatedAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}