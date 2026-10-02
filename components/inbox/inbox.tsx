"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ConversationMetaPatch } from "@/lib/hooks/use-inbox";
import {
  useAddNote,
  useConversation,
  useConversations,
  useSendReply,
  useSetConversationMeta,
  useSetConversationStatus,
} from "@/lib/hooks/use-inbox";
import type { Channel, ConversationStatus } from "@/lib/types";

import { channelMeta } from "./channel-badge";
import ChannelRail from "./channel-rail";
import ConversationList from "./conversation-list";
import type { ReplyPayload } from "./reply-box";
import ThemeToggle from "./theme-toggle";
import Thread from "./thread";

const ARCHIVED = "archived";

interface InboxProps {
  initialSelectedId?: string;
}

export default function Inbox({ initialSelectedId }: InboxProps) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);

  // React Query cached hooks
  const { data: all = [], isLoading: loadingList } = useConversations();
  const { data: detail, isLoading: loadingThread } = useConversation(selectedId);
  const sendMutation = useSendReply(selectedId);
  const statusMutation = useSetConversationStatus();
  const metaMutation = useSetConversationMeta(selectedId);
  const noteMutation = useAddNote(selectedId);

  // Handle browser back/forward buttons
  useEffect(() => {
    const onPopState = () => {
      const match = window.location.pathname.match(/\/conversations\/([^/]+)/);
      if (match) {
        setSelectedId(match[1]);
      } else {
        setSelectedId(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Archived threads live in their own view; the rest only shows open ones.
  const visible = useMemo(
    () =>
      filter === ARCHIVED
        ? all.filter((c) => c.status === "closed")
        : filter
          ? all.filter((c) => c.channel === filter && c.status === "open")
          : all.filter((c) => c.status === "open"),
    [all, filter],
  );

  // Rail badges count unread inbound messages; Archived keeps a closed-thread tally.
  const counts = useMemo<Record<string, number>>(() => {
    const unread: Record<string, number> = { total: 0, [ARCHIVED]: 0 };
    for (const c of all) {
      if (c.status !== "open") {
        unread[ARCHIVED] += 1;
        continue;
      }
      unread.total += c.unreadCount;
      unread[c.channel] = (unread[c.channel] ?? 0) + c.unreadCount;
    }
    return unread;
  }, [all]);

  // Keyboard triage: j/k walk the list, Enter opens, a archives, Esc goes back.
  const visibleRef = useRef(visible);
  const selectedRef = useRef(selectedId);

  useEffect(() => {
    visibleRef.current = visible;
    selectedRef.current = selectedId;
  }, [visible, selectedId]);

  const move = useCallback((delta: number) => {
    const list = visibleRef.current;
    if (list.length === 0) return;
    const at = list.findIndex((c) => c.id === selectedRef.current);
    const next = at === -1 ? (delta > 0 ? 0 : list.length - 1) : Math.min(Math.max(at + delta, 0), list.length - 1);
    const target = list[next];
    if (!target) return;
    setSelectedId(target.id);
    window.history.pushState(null, "", `/conversations/${target.id}`);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const el = event.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        move(1);
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "a") {
        const target = selectedRef.current;
        if (target) statusMutation.mutate({ id: target, status: "closed" });
      } else if (event.key === "Escape" && selectedRef.current) {
        setSelectedId(null);
        window.history.pushState(null, "", "/inbox");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move, statusMutation]);

  function select(id: string) {
    setSelectedId(id);
    window.history.pushState(null, "", `/conversations/${id}`);
  }

  function back() {
    setSelectedId(null);
    window.history.pushState(null, "", "/inbox");
  }

  async function handleSend(payload: ReplyPayload) {
    await sendMutation.mutateAsync(payload);
  }

  async function handleNote(text: string) {
    await noteMutation.mutateAsync({ text });
  }

  function handleMeta(patch: ConversationMetaPatch) {
    metaMutation.mutate(patch);
  }

  function handleArchive(status: ConversationStatus) {
    if (!selectedId) return;
    statusMutation.mutate({ id: selectedId, status });
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-canvas text-ink selection:bg-ink selection:text-on-primary">
      {/* 48px Geist Navbar (per DESIGN.md nav-bar) */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-canvas px-4">
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              back();
            }}
            className="group flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-hairline bg-ink text-on-primary shadow-2xs">
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 19.7778H22L12 2Z" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold tracking-[-0.02em] text-ink">
                ConnectMe
              </span>
              <span className="rounded-[4px] border border-hairline bg-surface-well px-1.5 py-0.2 font-mono text-[9.5px] uppercase tracking-wider text-mute">
                Unified Gateway
              </span>
            </div>
          </a>

          <span className="hidden h-3.5 w-px bg-hairline md:block" />

          {/* Connected Gateway Health */}
          <div className="hidden items-center gap-2 md:flex select-none font-mono text-[11px]">
            <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-canvas-elevated px-2 py-0.5 text-body shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-whatsapp" />
              <span className="text-[10px] text-mute uppercase">WhatsApp</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-canvas-elevated px-2 py-0.5 text-body shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-messenger" />
              <span className="text-[10px] text-mute uppercase">Messenger</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-canvas-elevated px-2 py-0.5 text-body shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              <span className="text-[10px] text-mute uppercase">Telegram</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-canvas-elevated px-2 py-0.5 text-body shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
              <span className="text-[10px] text-mute uppercase">Instagram</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => void logout()}
            className="flex h-8 items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink shadow-2xs"
          >
            <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Conversations Sidebar */}
        <aside
          className={`min-h-0 w-full shrink-0 border-r border-hairline bg-canvas md:flex md:w-[380px] ${
            selectedId ? "hidden" : "flex"
          }`}
        >
          <ChannelRail value={filter} onChange={setFilter} counts={counts} />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-hairline bg-canvas px-3.5">
              <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">
                {filter === ARCHIVED
                  ? "Archived"
                  : filter
                    ? channelMeta(filter as Channel).label
                    : "All conversations"}
              </span>
              <span className="rounded-full bg-surface-well px-1.5 py-0.5 font-mono text-[9.5px] tabular-nums text-mute">
                {visible.length}
              </span>
            </div>
            <ConversationList
              conversations={visible}
              selectedId={selectedId}
              onSelect={select}
              loading={loadingList}
            />
          </div>
        </aside>

        {/* Conversation Thread */}
        {detail ? (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Thread
              conversation={detail.conversation}
              messages={detail.messages}
              onBack={back}
              onSend={handleSend}
              onNote={handleNote}
              onArchive={handleArchive}
              onMeta={handleMeta}
            />
          </main>
        ) : (
          <main
            className={`min-h-0 min-w-0 flex-1 items-center justify-center bg-canvas ${
              selectedId ? "flex" : "hidden md:flex"
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-hairline bg-canvas-elevated text-mute shadow-2xs mb-3">
                <svg className="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-ink">
                {loadingThread && selectedId ? "Loading conversation…" : "No conversation selected"}
              </p>
              <p className="mt-1 text-[12px] text-body leading-relaxed">
                {selectedId
                  ? "Fetching cached messages from memory…"
                  : "Select a conversation from the sidebar to view thread history and reply."}
              </p>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}