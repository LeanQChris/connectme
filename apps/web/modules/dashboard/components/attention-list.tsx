import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REPLY_WINDOW_MS } from "@/core/utils/window";
import { UNLIMITED_WINDOW_CHANNELS, type AttentionItem } from "../data/dashboard.types";

function windowLabel(item: AttentionItem, now: number): string {
  if (!item.replyWindowEndsAt) return "No reply window";
  if (UNLIMITED_WINDOW_CHANNELS.includes(item.channel)) return "No reply limit";

  const msLeft = new Date(item.replyWindowEndsAt).getTime() - now;
  if (msLeft <= 0) return "Window expired";

  const totalMinutes = Math.floor(msLeft / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const left = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return msLeft <= REPLY_WINDOW_MS * 0.25 ? `${left} left` : `${left} in window`;
}

export function AttentionList({ items, now }: { items: AttentionItem[]; now: number }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Needs attention</CardTitle>
        <Link
          href="/inbox"
          className="text-[11.5px] font-medium text-link transition-colors hover:text-link-deep"
        >
          Open inbox →
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-mute">
            Nothing waiting. Every open conversation has been read.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {items.map((item) => {
              const expiring =
                item.replyWindowEndsAt !== null &&
                !UNLIMITED_WINDOW_CHANNELS.includes(item.channel) &&
                new Date(item.replyWindowEndsAt).getTime() - now <= REPLY_WINDOW_MS * 0.25;

              return (
                <li key={item.id}>
                  <Link
                    href={`/conversations/${item.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-well"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-ink">
                        {item.contactName}
                      </p>
                      <p className="truncate text-[11px] text-mute">
                        {new Date(item.lastMessageAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[11px] text-mute">
                        {windowLabel(item, now)}
                      </span>
                      <Badge variant={item.unreadCount > 4 ? "destructive" : "default"}>
                        {item.unreadCount} unread
                      </Badge>
                      {expiring && <Badge variant="destructive">Urgent</Badge>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}