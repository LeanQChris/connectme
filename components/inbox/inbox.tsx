"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ConversationDetail, ConversationSummary } from "@/lib/types";

import ConversationList, { ConversationFilter } from "./conversation-list";
import ThemeToggle from "./theme-toggle";
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
    () => ({
      total: all.length,
      ...Object.fromEntries(
        ["whatsapp", "messenger"].map((channel) => [
          channel,
          all.filter((c) => c.channel === channel).length,
        ]),
      ),
    }),
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
    if (!selectedId || !detail) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      conversationId: selectedId,
      direction: "out" as const,
      type: "text" as const,
      text,
      externalId: null,
      channel: detail.conversation.channel,
      status: "sent" as const,
      error: null,
      createdAt: new Date().toISOString(),
    };

    // 1. Instant UI update in thread
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            conversation: {
              ...prev.conversation,
              lastMessage: text,
              lastMessageAt: optimisticMessage.createdAt,
            },
            messages: [...prev.messages, optimisticMessage],
          }
        : null,
    );

    // 2. Instant UI update in conversation list
    setAll((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? {
              ...c,
              lastMessage: text,
              lastMessageAt: optimisticMessage.createdAt,
            }
          : c,
      ),
    );

    // 3. Dispatch to server
    try {
      const response = await fetch(`/api/conversations/${selectedId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await response.json()) as { error?: string; message?: typeof optimisticMessage };

      if (!response.ok) throw new Error(data.error ?? "Could not send the message");

      if (data.message) {
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((m) => (m.id === tempId ? data.message! : m)),
              }
            : null,
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Send failed";
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === tempId ? { ...m, status: "failed" as const, error: errorMsg } : m,
              ),
            }
          : null,
      );
      throw err;
    }
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-bg text-ink selection:bg-accent/20">
      {/* App Navigation Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-surface/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xs">
              ⚡
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold tracking-tight text-ink leading-none">
                ConnectMe
              </span>
              <span className="text-[10.5px] text-ink-muted font-medium mt-0.5">
                Unified Meta Inbox
              </span>
            </div>
          </div>

          <span className="hidden h-4 w-px bg-hairline md:block" />

          <div className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-500 ring-1 ring-emerald-500/20 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Polling</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary transition-all hover:bg-surface-2 hover:text-ink shadow-2xs"
          >
            <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Conversations Sidebar */}
        <aside
          className={`min-h-0 w-full shrink-0 flex-col border-r border-hairline bg-surface/30 md:flex md:w-[350px] ${
            selectedId ? "hidden" : "flex"
          }`}
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-hairline px-3.5 bg-surface/50">
            <ConversationFilter value={filter} onChange={setFilter} counts={counts} />
          </div>
          <ConversationList
            conversations={visible}
            selectedId={selectedId}
            onSelect={select}
            loading={loading}
          />
        </aside>

        {/* Conversation Thread */}
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
            className={`min-h-0 min-w-0 flex-1 items-center justify-center bg-surface/20 ${
              selectedId ? "flex" : "hidden md:flex"
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 text-2xl shadow-xs ring-1 ring-hairline mb-4">
                💬
              </div>
              <p className="text-[15px] font-semibold text-ink">
                {selectedId ? "Loading conversation…" : "Select a conversation"}
              </p>
              <p className="mt-1 text-[13px] text-ink-muted leading-relaxed">
                {selectedId
                  ? "Fetching the message thread history."
                  : "Choose a conversation from the left sidebar to start chatting."}
              </p>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}