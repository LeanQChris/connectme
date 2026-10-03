import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatShortDay, type VolumePoint } from "../data/dashboard.types";

interface VolumeChartProps {
  volume: VolumePoint[];
  windowDays: number;
}

export function VolumeChart({ volume, windowDays }: VolumeChartProps) {
  const max = Math.max(1, ...volume.map((point) => Math.max(point.inbound, point.outbound)));
  const labelEvery = Math.max(1, Math.ceil(volume.length / 7));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Message volume</CardTitle>
        <div className="flex items-center gap-3 text-[11px] text-mute">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-messenger" />
            Inbound
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
            Outbound
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex h-40 items-end gap-[3px]">
          {volume.map((point, index) => {
            const inboundHeight = (point.inbound / max) * 100;
            const outboundHeight = (point.outbound / max) * 100;
            const showLabel = index % labelEvery === 0 || index === volume.length - 1;

            return (
              <div
                key={point.date}
                className="group relative flex h-full flex-1 flex-col justify-end gap-[2px]"
                title={`${formatShortDay(point.date)} · ${point.inbound} in · ${point.outbound} out`}
              >
                <div
                  className="w-full rounded-[2px] bg-messenger/70 transition-colors group-hover:bg-messenger"
                  style={{ height: `${inboundHeight}%` }}
                />
                <div
                  className="w-full rounded-[2px] bg-primary/70 transition-colors group-hover:bg-primary"
                  style={{ height: `${outboundHeight}%` }}
                />
                {showLabel && (
                  <span className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9.5px] whitespace-nowrap text-faint">
                    {formatShortDay(point.date)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-[11px] text-mute">
          Last {windowDays} days · peak {max} messages in a day
        </p>
      </CardContent>
    </Card>
  );
}