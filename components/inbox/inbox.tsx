"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import UserMenu from "@/components/auth/user-menu";
import { useQueryClient } from "@tanstack/react-query";
import type { ConversationMetaPatch } from "@/lib/hooks/use-inbox";
import {
  useAddNote,
  useConversation,
  useConversations,
  useDeleteConversation,
  useSendReply,
  useSetConversationMeta,
  useSetConversationStatus,
  useSettings,
} from "@/lib/hooks/use-inbox";
import type { Channel, ConversationStatus } from "@/lib/types";

import { channelMeta } from "./channel-badge";
import ChannelRail from "./channel-rail";
import ConversationList from "./conversation-list";
import NewConversationModal from "./new-conversation-modal";
import type { ReplyPayload } from "./reply-box";
import SoundToggle from "./sound-toggle";
import ThemeToggle from "./theme-toggle";
import Thread from "./thread";
import Logo from "@/components/logo";
import { soundNotifier } from "@/lib/audio-chime";

const ARCHIVED = "archived";

interface InboxProps {
  initialSelectedId?: string;
}

export default function Inbox({ initialSelectedId }: InboxProps) {
  const [filter, setFilter] = useState("");
  const [accountId, setAccountId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [savedFilters, setSavedFilters] = useState<
    { name: string; channel: string; status: string; tag: string; unassigned: boolean }[]
  >([]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");

  // React Query cached hooks
  const { data: all = [], isLoading: loadingList } = useConversations();
  const { data: detail, isLoading: loadingThread } = useConversation(selectedId);
  const { data: settingsData } = useSettings();
  const connected = settingsData?.settings?.connected;
  const accounts = useMemo(() => settingsData?.settings?.accounts ?? [], [settingsData]);

  const sendMutation = useSendReply(selectedId);
  const queryClient = useQueryClient();
  const statusMutation = useSetConversationStatus();
  const metaMutation = useSetConversationMeta(selectedId);
  const noteMutation = useAddNote(selectedId);
  const deleteMutation = useDeleteConversation();

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

  // Load saved filters + notification permission on mount; register SW.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("connectme:savedFilters");
      if (raw) setSavedFilters(JSON.parse(raw));
    } catch {}
    if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      fetch("/sw.js", { method: "HEAD" })
        .then((res) => {
          if (res.ok) return navigator.serviceWorker.register("/sw.js");
        })
        .catch(() => {});
    }
  }, []);

  // Page filter only makes sense inside one channel: "All conversations" mixes
// Messenger pages and Instagram handles, so the dropdown would be ambiguous.
  const channelFilter = filter && filter !== ARCHIVED ? filter : "";
  const scopedAccounts = useMemo(
    () => (channelFilter ? accounts.filter((a) => a.channel === channelFilter) : []),
    [accounts, channelFilter],
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
      )
        .filter((c) => !activeAccountId || c.accountId === activeAccountId)
        .filter((c) => !tagFilter || c.tags.includes(tagFilter))
        .filter((c) => !unassignedOnly || !c.assignee),
    [all, filter, activeAccountId, tagFilter, unassignedOnly],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of all) for (const t of c.tags) set.add(t);
    return [...set].sort();
  }, [all]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulk(patch: { status?: string; tags?: string[] }) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await fetch("/api/conversations/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids, ...patch }),
      });
    } finally {
      setSelectedIds(new Set());
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  }

  function saveCurrentView() {
    const name = window.prompt("Name this view:");
    if (!name || !name.trim()) return;
    const entry = {
      name: name.trim(),
      channel: filter,
      status: filter === ARCHIVED ? "closed" : "open",
      tag: tagFilter,
      unassigned: unassignedOnly,
    };
    const next = [...savedFilters.filter((f) => f.name !== entry.name), entry];
    setSavedFilters(next);
    try {
      window.localStorage.setItem("connectme:savedFilters", JSON.stringify(next));
    } catch {}
  }

  function applySavedFilter(f: (typeof savedFilters)[number]) {
    setFilter(f.status === "closed" ? ARCHIVED : f.channel);
    setTagFilter(f.tag);
    setUnassignedOnly(f.unassigned);
  }

  async function toggleNotifications() {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      // No programmatic revoke; guide user via a no-op toggle off state.
      setNotifPermission("default");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }

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

  // Dynamic Browser Tab Title & Audio Notification Chime
  const prevUnreadRef = useRef<number | null>(null);
  useEffect(() => {
    const currentUnread = counts.total ?? 0;
    if (typeof document !== "undefined") {
      document.title = currentUnread > 0 ? `(${currentUnread}) ConnectMe · Inbox` : "ConnectMe · Inbox";
    }

    if (prevUnreadRef.current !== null && currentUnread > prevUnreadRef.current) {
      soundNotifier.playChime();
      if (
        typeof document !== "undefined" &&
        document.hidden &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("New message", { body: "You have new unread messages in ConnectMe." });
        } catch {}
      }
    }
    prevUnreadRef.current = currentUnread;
  }, [counts.total]);

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
    const result = await sendMutation.mutateAsync(payload);
    return result as { skipped?: string[]; supportedTypes?: string[] };
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

  function handleDelete() {
    if (!selectedId) return;
    const targetId = selectedId;
    back();
    deleteMutation.mutate(targetId);
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-canvas text-ink selection:bg-ink selection:text-on-primary">
      {/* 48px Geist Navbar (per DESIGN.md nav-bar) */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-canvas px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={(e) => {
              if (selectedId) {
                e.preventDefault();
                back();
              }
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
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <SoundToggle />
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
              {channelFilter && scopedAccounts.length > 1 && (
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
              <button
                type="button"
                onClick={() => void toggleNotifications()}
                title={notifPermission === "granted" ? "Notifications on" : "Enable notifications"}
                className={`ml-auto flex h-7 w-7 items-center justify-center rounded-[6px] border text-[12px] transition-colors ${
                  notifPermission === "granted"
                    ? "border-ink bg-ink text-on-primary"
                    : "border-hairline bg-canvas-elevated text-body hover:bg-surface-well hover:text-ink"
                } ${channelFilter && scopedAccounts.length > 1 ? "ml-1.5" : ""}`}
              >
                🔔
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 border-b border-hairline bg-canvas px-3.5 py-1.5">
              <select
                value={tagFilter}
                aria-label="Filter by tag"
                onChange={(e) => setTagFilter(e.target.value)}
                className="h-7 rounded-[6px] border border-hairline bg-canvas-elevated px-1.5 font-mono text-[10.5px] text-body focus:outline-none"
              >
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setUnassignedOnly((v) => !v)}
                className={`h-7 rounded-full border px-2.5 font-mono text-[10.5px] transition-colors ${
                  unassignedOnly
                    ? "border-ink bg-ink text-on-primary"
                    : "border-hairline bg-canvas-elevated text-mute hover:text-ink"
                }`}
              >
                Unassigned
              </button>
              {savedFilters.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => applySavedFilter(f)}
                  className="h-7 rounded-full border border-hairline bg-canvas-elevated px-2.5 font-mono text-[10.5px] text-body transition-colors hover:bg-surface-well hover:text-ink"
                >
                  {f.name}
                </button>
              ))}
              <button
                type="button"
                onClick={saveCurrentView}
                className="h-7 rounded-full border border-dashed border-hairline px-2.5 font-mono text-[10.5px] text-mute transition-colors hover:text-ink"
              >
                + Save view
              </button>
            </div>
            {selectedIds.size > 0 && (
              <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-hairline bg-canvas-elevated px-3.5 py-2 shadow-2xs">
                <span className="font-mono text-[11px] text-mute">{selectedIds.size} selected</span>
                <button
                  type="button"
                  onClick={() => void bulk({ status: "closed" })}
                  className="rounded-[6px] border border-hairline bg-canvas px-2.5 py-1 text-[11.5px] text-body hover:bg-surface-well"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => void bulk({ status: "open" })}
                  className="rounded-[6px] border border-hairline bg-canvas px-2.5 py-1 text-[11.5px] text-body hover:bg-surface-well"
                >
                  Reopen
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const tag = window.prompt("Add tag to selected:");
                    if (!tag || !tag.trim()) return;
                    const clean = tag.trim().toLowerCase();
                    // Bulk replaces tags, so merge per conversation here.
                    await Promise.all(
                      [...selectedIds].map((id) => {
                        const existing = all.find((c) => c.id === id)?.tags ?? [];
                        const nextTags = existing.includes(clean) ? existing : [...existing, clean];
                        return fetch(`/api/conversations/${id}`, {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ tags: nextTags }),
                        });
                      }),
                    );
                    setSelectedIds(new Set());
                    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
                  }}
                  className="rounded-[6px] border border-hairline bg-canvas px-2.5 py-1 text-[11.5px] text-body hover:bg-surface-well"
                >
                  + Tag
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto text-[11.5px] text-mute hover:text-ink"
                >
                  Clear
                </button>
              </div>
            )}
            <ConversationList
              conversations={visible}
              selectedId={selectedId}
              onSelect={select}
              loading={loadingList}
              onNewConversation={() => setIsNewModalOpen(true)}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </div>
        </aside>

        {/* Conversation Thread */}
        {detail ? (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Thread
              conversation={detail.conversation}
              messages={detail.messages}
              typers={detail.typers}
              onBack={back}
              onSend={handleSend}
              onNote={handleNote}
              onArchive={handleArchive}
              onDelete={handleDelete}
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
              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="mt-4 flex items-center gap-1.5 rounded-[6px] bg-primary px-3.5 py-2 text-[12.5px] font-medium text-on-primary transition-opacity hover:opacity-90 active:scale-95 cursor-pointer shadow-2xs"
              >
                <span>+</span>
                <span>Start New Conversation</span>
              </button>
            </div>
          </main>
        )}
      </div>

      {/* New Conversation Directory Modal */}
      <NewConversationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSelectConversation={(id, ch) => {
          if (ch && filter && filter !== ch) {
            setFilter("");
          }
          select(id);
        }}
        initialChannel={filter}
        connected={connected}
        accounts={accounts}
      />
    </div>
  );
}