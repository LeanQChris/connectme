"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ConversationDetail, ConversationSummary } from "@/lib/types";

import ConversationList, { ConversationFilter } from "./conversation-list";
import Thread from "./thread";

const POLL_MS = 3000;

/**
 * Polls a callback on an interval. `key` restarts the timer whenever the
 * resource changes, and overlapping requests are skipped.
 */
function usePolling(callback: () => Promise<void>, key: string) {
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        await latest.current();
      } finally {
        busy = false;
      }
    };

    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [key]);
}

export default function Inbox() {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [all, setAll] = useState<ConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // One request per tick; filtering and counts are derived here.
  const visible = useMemo(
    () => (filter ? all.filter((c) => c.channel === filter) : all),
    [all, filter],
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        ["whatsapp", "messenger"].map((channel) => [
          channel,
          all.filter((c) => c.channel === channel).length,
        ]),
      ),
    [all],
  );

  usePolling(async () => {
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load conversations");
      const data = (await response.json()) as { conversations: ConversationSummary[] };
      setAll(data.conversations);
    } catch {
      // Keep showing the last good data; the next poll retries.
    } finally {
      setLoading(false);
    }
  }, "list");

  async function loadThread(id: string) {
    const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load the conversation");
    const data = (await response.json()) as ConversationDetail;
    setDetail(data);
    // The server marked it read, so reflect that in the list immediately.
    setAll((current) => current.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
  }

  usePolling(async () => {
    if (!selectedId) return;
    try {
      await loadThread(selectedId);
    } catch {
      // Ignore: retried on the next tick.
    }
  }, selectedId ?? "none");

  function select(id: string) {
    setDetail(null);
    setSelectedId(id);
  }

  async function send(text: string) {
    if (!selectedId) return;

    const response = await fetch(`/api/conversations/${selectedId}/reply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) throw new Error(data.error ?? "Could not send the message");

    await loadThread(selectedId);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-hairline px-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[13px] font-medium tracking-tight text-ink">Inbox</h1>
          <span className="font-mono text-[11px] tabular-nums text-ink-muted">{all.length}</span>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-md px-2 py-1 text-xs text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink"
        >
          Sign out
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`min-h-0 w-full shrink-0 flex-col border-r border-hairline md:flex md:w-[340px] ${
            selectedId ? "hidden" : "flex"
          }`}
        >
          <div className="flex h-10 shrink-0 items-center border-b border-hairline px-3">
            <ConversationFilter value={filter} onChange={setFilter} counts={counts} />
          </div>
          <ConversationList
            conversations={visible}
            selectedId={selectedId}
            onSelect={select}
            loading={loading}
          />
        </aside>

        {detail ? (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Thread
              conversation={detail.conversation}
              messages={detail.messages}
              onBack={() => setSelectedId(null)}
              onSend={send}
            />
          </main>
        ) : (
          <main
            className={`min-h-0 min-w-0 flex-1 items-center justify-center ${
              selectedId ? "flex" : "hidden md:flex"
            }`}
          >
            <div className="text-center">
              <p className="text-[13px] font-medium text-ink-secondary">
                {selectedId ? "Loading conversation…" : "No conversation open"}
              </p>
              <p className="mt-1 text-[13px] text-ink-muted">
                {selectedId
                  ? "Fetching the thread."
                  : "Pick a conversation on the left to read and reply."}
              </p>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}