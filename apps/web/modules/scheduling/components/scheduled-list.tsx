"use client";

import type {
  ScheduledMessage,
  ScheduledPost,
  ScheduledPostStatus,
} from "../data/scheduling.types";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "border-hairline bg-surface-well text-body",
  scheduled: "border-warning/30 bg-warning/10 text-warning",
  published: "border-hairline-strong bg-surface-well text-ink",
  sent: "border-hairline-strong bg-surface-well text-ink",
  failed: "border-error/30 bg-error/10 text-error",
  canceled: "border-hairline bg-surface-well text-mute",
};

function StatusBadge({ status }: { status: ScheduledPostStatus | string }) {
  return (
    <span
      className={`rounded-full border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider ${
        STATUS_STYLES[status] ?? STATUS_STYLES.pending
      }`}
    >
      {status}
    </span>
  );
}

function channelLabel(channel: string): string {
  return channel === "messenger" ? "Facebook Page" : channel.charAt(0).toUpperCase() + channel.slice(1);
}

export interface ScheduledPostsListProps {
  posts: ScheduledPost[];
  pendingId?: string | null;
  onCancel: (id: string) => void;
  onEdit?: (post: ScheduledPost) => void;
}

export function ScheduledPostsList({
  posts,
  pendingId,
  onCancel,
  onEdit,
}: ScheduledPostsListProps) {
  if (posts.length === 0) {
    return (
      <p className="py-10 text-center text-[12.5px] text-mute">
        No scheduled posts yet. Create one to get started.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {posts.map((post) => {
        const actionable = post.status !== "published" && post.status !== "canceled";
        return (
          <li
            key={post.id}
            className="rounded-[8px] border border-hairline bg-canvas-elevated p-3 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <StatusBadge status={post.status} />
                <span className="truncate text-[11px] text-mute">{channelLabel(post.channel)}</span>
                {post.mode === "native" && (
                  <span className="rounded border border-hairline px-1 font-mono text-[9px] text-mute">
                    native
                  </span>
                )}
              </div>
              <span className="shrink-0 font-mono text-[11px] text-body">
                {formatDateTime(post.scheduledFor)}
              </span>
            </div>

            {post.caption && (
              <p className="mt-1.5 line-clamp-2 text-[12.5px] text-ink">{post.caption}</p>
            )}
            {post.mediaUrls.length > 0 && (
              <p className="mt-1 truncate font-mono text-[10.5px] text-mute">
                {post.mediaUrls.length} media attachment(s)
              </p>
            )}
            {post.lastError && (
              <p className="mt-1.5 rounded-[6px] border border-error/20 bg-error/10 px-2 py-1 text-[11px] text-error">
                {post.lastError}
              </p>
            )}

            {actionable && (
              <div className="mt-2 flex items-center gap-2">
                {onEdit && post.status !== "failed" && (
                  <button
                    type="button"
                    onClick={() => onEdit(post)}
                    className="rounded-[6px] border border-hairline px-2 py-0.5 text-[11px] text-body transition-colors hover:bg-surface-well hover:text-ink cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  disabled={pendingId === post.id}
                  onClick={() => onCancel(post.id)}
                  className="rounded-[6px] border border-hairline px-2 py-0.5 text-[11px] text-error transition-colors hover:bg-error/10 disabled:opacity-50 cursor-pointer"
                >
                  {pendingId === post.id ? "Canceling…" : "Cancel"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export interface ScheduledMessagesListProps {
  messages: ScheduledMessage[];
  pendingId?: string | null;
  onCancel: (id: string) => void;
}

export function ScheduledMessagesList({
  messages,
  pendingId,
  onCancel,
}: ScheduledMessagesListProps) {
  if (messages.length === 0) {
    return (
      <p className="py-10 text-center text-[12.5px] text-mute">
        No scheduled messages. Use the Schedule button in a conversation reply box.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {messages.map((message) => {
        const actionable = message.status === "pending" || message.status === "failed";
        return (
          <li
            key={message.id}
            className="rounded-[8px] border border-hairline bg-canvas-elevated p-3 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={message.status} />
                <span className="text-[11px] text-mute">{channelLabel(message.channel)}</span>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-body">
                {formatDateTime(message.scheduledFor)}
              </span>
            </div>

            {message.text && (
              <p className="mt-1.5 line-clamp-2 text-[12.5px] text-ink">{message.text}</p>
            )}
            {message.mediaUrl && (
              <p className="mt-1 font-mono text-[10.5px] text-mute">with attachment</p>
            )}
            {message.lastError && (
              <p className="mt-1.5 rounded-[6px] border border-error/20 bg-error/10 px-2 py-1 text-[11px] text-error">
                {message.lastError}
              </p>
            )}

            {actionable && (
              <div className="mt-2">
                <button
                  type="button"
                  disabled={pendingId === message.id}
                  onClick={() => onCancel(message.id)}
                  className="rounded-[6px] border border-hairline px-2 py-0.5 text-[11px] text-error transition-colors hover:bg-error/10 disabled:opacity-50 cursor-pointer"
                >
                  {pendingId === message.id ? "Canceling…" : "Cancel"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}