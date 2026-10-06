"use client";

import { useQuery } from "@tanstack/react-query";

interface Metrics {
  conversations: { open: number; closed: number; total: number };
  perChannel: Record<string, number>;
  avgFirstResponseMs: number | null;
  avgCsat: number | null;
  csatCount: number;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)} min`;
}

export default function MetricsDashboard() {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery<Metrics>({
    queryKey: ["metrics"],
    queryFn: async () => {
      const res = await fetch("/api/metrics", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load metrics");
      return res.json() as Promise<Metrics>;
    },
    refetchInterval: 5000,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">
            Workspace Metrics
          </h1>
          <p className="mt-1 text-[13.5px] text-body">
            Live conversation stats. Refreshes every 5 seconds.
          </p>
        </div>
        {dataUpdatedAt > 0 && (
          <span className="font-mono text-[11px] text-mute">
            Updated {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {isError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3.5 text-[13px] text-error">
          Could not load metrics.
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-hairline bg-surface-well/50" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card label="Total conversations" value={String(data.conversations.total)} />
          <Card label="Open" value={String(data.conversations.open)} />
          <Card label="Closed" value={String(data.conversations.closed)} />
          <Card
            label="Avg first response"
            value={formatDuration(data.avgFirstResponseMs)}
          />
          <Card
            label="Avg CSAT"
            value={data.avgCsat === null ? "—" : data.avgCsat.toFixed(2)}
            hint={`${data.csatCount} rating${data.csatCount === 1 ? "" : "s"}`}
          />
          <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 shadow-xs sm:col-span-2 lg:col-span-1">
            <p className="text-[12px] font-medium uppercase tracking-wide text-mute">Per channel</p>
            {Object.keys(data.perChannel).length === 0 ? (
              <p className="mt-3 text-[13px] text-mute">No conversations yet.</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {Object.entries(data.perChannel).map(([channel, count]) => (
                  <li key={channel} className="flex items-center justify-between text-[13px]">
                    <span className="capitalize text-body">{channel}</span>
                    <span className="font-mono text-ink">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-canvas-elevated p-5 shadow-xs">
      <p className="text-[12px] font-medium uppercase tracking-wide text-mute">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-ink">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-mute">{hint}</p>}
    </div>
  );
}
