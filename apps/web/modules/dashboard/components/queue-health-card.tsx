import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ScheduledMessageCount,
  ScheduledPostCount,
} from "../data/dashboard.types";

interface QueueHealthCardProps {
  posts: ScheduledPostCount[];
  messages: ScheduledMessageCount[];
}

const POST_LABELS: Record<string, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
  canceled: "Canceled",
};

const MESSAGE_LABELS: Record<string, string> = {
  pending: "Pending",
  sent: "Sent",
  failed: "Failed",
  canceled: "Canceled",
};

function Row({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className={count > 0 && /failed/i.test(label) ? "text-error" : "text-body"}>{label}</span>
      <span className="font-mono text-[11.5px] text-ink">{count}</span>
    </div>
  );
}

export function QueueHealthCard({ posts, messages }: QueueHealthCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-mute">Posts</p>
          {posts.map((row) => (
            <Row key={row.status} label={POST_LABELS[row.status] ?? row.status} count={row.count} />
          ))}
        </div>
        <div className="space-y-1.5 border-t border-hairline pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-mute">
            Scheduled replies
          </p>
          {messages.map((row) => (
            <Row
              key={row.status}
              label={MESSAGE_LABELS[row.status] ?? row.status}
              count={row.count}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}