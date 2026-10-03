"use client";

import { useMemo, useState } from "react";
import SiteHeader from "@/components/layout/site-header";
import { useSettings } from "@/modules/inbox/hooks/use-inbox";
import type { ScheduledPost } from "./data/scheduling.types";
import {
  useCancelScheduledMessage,
  useCancelScheduledPost,
  useScheduledMessages,
  useScheduledPosts,
  useSchedulingRealtime,
} from "./hooks/use-scheduling";
import { CreatePostForm } from "./components/create-post-form";
import { ScheduledCalendar } from "./components/scheduled-calendar";
import { ScheduledMessagesList, ScheduledPostsList } from "./components/scheduled-list";

type Tab = "posts" | "messages";

export default function SchedulingModule() {
  const [tab, setTab] = useState<Tab>("posts");
  const [editing, setEditing] = useState<ScheduledPost | null>(null);

  const { data: settings } = useSettings();
  const accounts = useMemo(() => settings?.settings?.accounts ?? [], [settings]);

  useSchedulingRealtime();

  const postsQuery = useScheduledPosts();
  const messagesQuery = useScheduledMessages();
  const cancelPost = useCancelScheduledPost();
  const cancelMessage = useCancelScheduledMessage();

  const pendingId = cancelPost.isPending
    ? cancelPost.variables ?? null
    : cancelMessage.isPending
      ? cancelMessage.variables ?? null
      : null;

  const counts = useMemo(() => {
    const posts = postsQuery.data ?? [];
    const messages = messagesQuery.data ?? [];
    const upcoming = [...posts, ...messages].filter(
      (item) => item.status === "pending" || item.status === "scheduled",
    ).length;
    const failed = [...posts, ...messages].filter((item) => item.status === "failed").length;
    return { upcoming, failed };
  }, [postsQuery.data, messagesQuery.data]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Scheduling</h1>
            <p className="mt-0.5 text-[12.5px] text-mute">
              Queue posts to your Pages and Instagram, and schedule replies in conversations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-hairline bg-surface-well px-2 py-0.5 font-mono text-[10.5px] text-body">
              {counts.upcoming} upcoming
            </span>
            {counts.failed > 0 && (
              <span className="rounded-full border border-error/30 bg-error/10 px-2 py-0.5 font-mono text-[10.5px] text-error">
                {counts.failed} failed
              </span>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-1 border-b border-hairline">
          {(["posts", "messages"] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`-mb-px border-b-2 px-3 py-2 text-[12.5px] font-medium capitalize transition-colors cursor-pointer ${
                tab === item
                  ? "border-ink text-ink"
                  : "border-transparent text-mute hover:text-ink"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "posts" ? (
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <div className="flex flex-col gap-4">
              <CreatePostForm
                accounts={accounts}
                editing={editing}
                onCancelEdit={() => setEditing(null)}
                onDone={() => setEditing(null)}
              />
              <ScheduledCalendar posts={postsQuery.data ?? []} />
            </div>

            <div>
              {postsQuery.isLoading ? (
                <p className="py-10 text-center text-[12.5px] text-mute">Loading…</p>
              ) : (
                <ScheduledPostsList
                  posts={postsQuery.data ?? []}
                  pendingId={pendingId}
                  onCancel={(id) => cancelPost.mutate(id)}
                  onEdit={(post) => setEditing(post)}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            {messagesQuery.isLoading ? (
              <p className="py-10 text-center text-[12.5px] text-mute">Loading…</p>
            ) : (
              <ScheduledMessagesList
                messages={messagesQuery.data ?? []}
                pendingId={pendingId}
                onCancel={(id) => cancelMessage.mutate(id)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}