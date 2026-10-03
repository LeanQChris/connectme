import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelIcon, channelMeta } from "@/components/ui/channel-badge";
import type { ChannelBreakdown, StatusBreakdown } from "../data/dashboard.types";

interface ChannelBreakdownCardProps {
  byChannel: ChannelBreakdown[];
  byStatus: StatusBreakdown[];
}

export function ChannelBreakdownCard({ byChannel, byStatus }: ChannelBreakdownCardProps) {
  const totalOpen = byChannel.reduce((sum, row) => sum + row.open, 0);
  const active = byChannel.filter((row) => row.open > 0 || row.unread > 0);
  const totalConversations = byStatus.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channels</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-mute">No open conversations yet.</p>
        ) : (
          active.map((row) => {
            const meta = channelMeta(row.channel);
            const share = totalOpen > 0 ? (row.open / totalOpen) * 100 : 0;

            return (
              <div key={row.channel}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="flex items-center gap-1.5 text-ink">
                    <ChannelIcon channel={row.channel} className="h-3.5 w-3.5" />
                    {meta.label}
                  </span>
                  <span className="font-mono text-[11.5px] text-mute">
                    {row.open} open
                    {row.unread > 0 && <span className="text-warning"> · {row.unread} unread</span>}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-well">
                  <div
                    className={`h-full rounded-full ${meta.tile}`}
                    style={{ width: `${Math.max(share, row.open > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-hairline pt-3 text-[11.5px] text-mute">
          {byStatus.map((row) => (
            <span key={row.status}>
              <span className="font-mono text-ink">{row.count}</span> {row.status}
            </span>
          ))}
          <span className="ml-auto">
            <span className="font-mono text-ink">{totalConversations}</span> total
          </span>
        </div>
      </CardContent>
    </Card>
  );
}