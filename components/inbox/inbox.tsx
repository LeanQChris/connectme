"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import UserMenu from "@/components/auth/user-menu";
import type { ConversationMetaPatch } from "@/lib/hooks/use-inbox";
import {
  useAddNote,
  useConversation,
  useConversations,
  useSendReply,
  useSetConversationMeta,
  useSetConversationStatus,
  useSettings,
} from "@/lib/hooks/use-inbox";
import { CHANNELS, type Channel, type ConversationStatus } from "@/lib/types";

import { channelMeta } from "./channel-badge";
import ChannelRail from "./channel-rail";
import ConversationList from "./conversation-list";
import type { ReplyPayload } from "./reply-box";
import ThemeToggle from "./theme-toggle";
import Thread from "./thread";
import Logo from "@/components/logo";

const ARCHIVED = "archived";

interface InboxProps {
  initialSelectedId?: string;
}

export default function Inbox({ initialSelectedId }: InboxProps) {
  const [filter, setFilter] = useState("");
  const [accountId, setAccountId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);

  // React Query cached hooks
  const { data: all = [], isLoading: loadingList } = useConversations();
  const { data: detail, isLoading: loadingThread } = useConversation(selectedId);
  const { data: settingsData } = useSettings();
  const connected = settingsData?.settings?.connected;
  const accounts = useMemo(() => settingsData?.settings?.accounts ?? [], [settingsData]);

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

  // One page dropdown per channel; only pages of the channel in view are offered.
  const scopedAccounts = useMemo(
    () =>
      filter && filter !== ARCHIVED
        ? accounts.filter((a) => a.channel === filter)
        : accounts,
    [accounts, filter],
  );

  // A page picked under one channel is meaningless under another.
  const activeAccountId = scopedAccounts.some((a) => a.id === accountId) ? accountId : "";

  // Archived threads live in their own view; the rest only shows open ones.
  const visible = useMemo(
    () =>
      (filter === ARCHIVED
        ? all.filter((c) => c.status === "closed")
        : filter
          ? all.filter((c) => c.channel === filter && c.status === "open")
          : all.filter((c) => c.status === "open")
      ).filter((c) => !activeAccountId || c.accountId === activeAccountId),
    [all, filter, activeAccountId],
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
            <div className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-hairline bg-primary text-on-primary shadow-2xs">
              <Logo className="h-3.5 w-3.5" />
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
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Link
            href="/settings"
            className="flex h-8 items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink shadow-2xs"
          >
            <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
              />
            </svg>
            <span className="hidden sm:inline">Settings</span>
          </Link>

          <UserMenu />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Conversations Sidebar */}
        <aside
          className={`min-h-0 w-full shrink-0 border-r border-hairline bg-canvas md:flex md:w-[380px] ${
            selectedId ? "hidden" : "flex"
          }`}
        >
          <ChannelRail value={filter} onChange={setFilter} counts={counts} connected={connected} />

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
              {scopedAccounts.length > 1 && (
                <select
                  value={activeAccountId}
                  aria-label="Filter by page"
                  onChange={(event) => setAccountId(event.target.value)}
                  className="ml-auto h-7 max-w-[150px] rounded-[6px] border border-hairline bg-canvas-elevated pl-2 pr-1 font-mono text-[10.5px] text-body transition-colors hover:bg-surface-well focus:outline-none"
                >
                  <option value="">All pages</option>
                  {scopedAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              )}
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