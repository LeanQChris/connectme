"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useConversation, useConversations, useSendReply } from "@/lib/hooks/use-inbox";

import ConversationList, { ConversationFilter } from "./conversation-list";
import ThemeToggle from "./theme-toggle";
import Thread from "./thread";

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

  // Filter conversations
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

  function select(id: string) {
    setSelectedId(id);
    window.history.pushState(null, "", `/conversations/${id}`);
  }

  function back() {
    setSelectedId(null);
    window.history.pushState(null, "", "/");
  }

  async function handleSend(text: string) {
    await sendMutation.mutateAsync(text);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-bg text-ink selection:bg-accent/20">
      {/* Executive Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-surface/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              back();
            }}
            className="flex items-center gap-2.5 group cursor-pointer select-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
              ⚡
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold tracking-tight text-ink leading-none">
                ConnectMe
              </span>
              <span className="text-[10px] text-ink-muted font-medium mt-0.5">
                Meta Unified Gateway
              </span>
            </div>
          </a>

          <span className="hidden h-4 w-px bg-hairline md:block" />

          {/* Active Channels Health Indicator */}
          <div className="hidden items-center gap-2 md:flex select-none">
            <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Messenger</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>WhatsApp</span>
            </div>
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
            <span className="hidden sm:inline">Sign out</span>
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
            loading={loadingList}
          />
        </aside>

        {/* Conversation Thread */}
        {detail ? (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Thread
              conversation={detail.conversation}
              messages={detail.messages}
              onBack={back}
              onSend={handleSend}
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
                {loadingThread && selectedId ? "Loading conversation…" : "Select a conversation"}
              </p>
              <p className="mt-1 text-[13px] text-ink-muted leading-relaxed">
                {selectedId
                  ? "Fetching messages from cache…"
                  : "Choose a conversation from the left sidebar to start chatting."}
              </p>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}