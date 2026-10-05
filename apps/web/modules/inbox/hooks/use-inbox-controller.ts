"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInboxStore } from "../data/inbox-store";
import {
  useAddNote,
  useConversation,
  useConversations,
  useScheduleMessage,
  useSendReply,
  useSetConversationMeta,
  useSetConversationStatus,
  useSettings,
} from "./use-inbox";
import { useRealtimeInbox } from "./use-realtime";
import type { ConversationMetaPatch } from "../api/inbox.api";
import type { ConversationStatus } from "@/core/types";
import type { ReplyPayload } from "./use-reply-box";
import { soundNotifier } from "@/core/utils/audio-chime";

const ARCHIVED = "archived";

interface UseInboxControllerOptions {
  initialSelectedId?: string;
}

export function useInboxController({ initialSelectedId }: UseInboxControllerOptions = {}) {
  const filter = useInboxStore((s) => s.filter);
  const setFilter = useInboxStore((s) => s.setFilter);
  const accountId = useInboxStore((s) => s.accountId);
  const setAccountId = useInboxStore((s) => s.setAccountId);
  const selectedId = useInboxStore((s) => s.selectedId);
  const setSelectedId = useInboxStore((s) => s.setSelectedId);

  // Keep the store selection in sync with the route param (URL wins on change).
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
    }
  }, [initialSelectedId, setSelectedId]);

  // Connect to NestJS WebSocket gateway for 0ms live events
  useRealtimeInbox(selectedId);

  // React Query cached hooks
  const { data: all = [], isLoading: loadingList } = useConversations();
  const { data: detail, isLoading: loadingThread } = useConversation(selectedId);
  const { data: settingsData } = useSettings();
  const connected = settingsData?.settings?.connected;
  const accounts = useMemo(() => settingsData?.settings?.accounts ?? [], [settingsData]);

  const sendMutation = useSendReply(selectedId);
  const scheduleMutation = useScheduleMessage(selectedId);
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
  }, [setSelectedId]);

  // Scoped accounts per channel
  const channelFilter = filter && filter !== ARCHIVED ? filter : "";
  const scopedAccounts = useMemo(
    () => (channelFilter ? accounts.filter((a) => a.channel === channelFilter) : []),
    [accounts, channelFilter],
  );

  const activeAccountId = scopedAccounts.some((a) => a.id === accountId) ? accountId : "";

  // Visible conversations filtered by status & channel
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

  // Rail badges count unread inbound messages; Archived keeps a closed-thread tally
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
    }
    prevUnreadRef.current = currentUnread;
  }, [counts.total]);

  // Keyboard navigation
  const visibleRef = useRef(visible);
  const selectedRef = useRef(selectedId);

  useEffect(() => {
    visibleRef.current = visible;
    selectedRef.current = selectedId;
  }, [visible, selectedId]);

  const move = useCallback(
    (delta: number) => {
      const list = visibleRef.current;
      if (list.length === 0) return;
      const at = list.findIndex((c) => c.id === selectedRef.current);
      const next =
        at === -1
          ? delta > 0
            ? 0
            : list.length - 1
          : Math.min(Math.max(at + delta, 0), list.length - 1);
      const target = list[next];
      if (!target) return;
      setSelectedId(target.id);
      window.history.pushState(null, "", `/conversations/${target.id}`);
    },
    [setSelectedId],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const el = event.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
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
  }, [move, statusMutation, setSelectedId]);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      window.history.pushState(null, "", `/conversations/${id}`);
    },
    [setSelectedId],
  );

  const back = useCallback(() => {
    setSelectedId(null);
    window.history.pushState(null, "", "/inbox");
  }, [setSelectedId]);

  const handleSend = useCallback(
    async (payload: ReplyPayload) => {
      await sendMutation.mutateAsync(payload);
    },
    [sendMutation],
  );

  const handleSchedule = useCallback(
    async (payload: ReplyPayload, scheduledFor: string) => {
      await scheduleMutation.mutateAsync({ payload, scheduledFor });
    },
    [scheduleMutation],
  );

  const handleNote = useCallback(
    async (text: string) => {
      await noteMutation.mutateAsync({ text });
    },
    [noteMutation],
  );

  const handleMeta = useCallback(
    (patch: ConversationMetaPatch) => {
      metaMutation.mutate(patch);
    },
    [metaMutation],
  );

  const handleArchive = useCallback(
    (status: ConversationStatus) => {
      if (!selectedId) return;
      statusMutation.mutate({ id: selectedId, status });
    },
    [selectedId, statusMutation],
  );

  return {
    filter,
    setFilter,
    accountId,
    setAccountId,
    selectedId,
    visible,
    counts,
    connected,
    channelFilter,
    scopedAccounts,
    activeAccountId,
    loadingList,
    detail,
    loadingThread,
    select,
    back,
    handleSend,
    handleSchedule,
    handleNote,
    handleMeta,
    handleArchive,
  };
}
