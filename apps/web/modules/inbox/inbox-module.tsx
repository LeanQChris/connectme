"use client";

import type { Channel } from "@/core/types";
import { channelMeta } from "@/components/ui/channel-badge";
import { useInboxController } from "./hooks/use-inbox-controller";
import { InboxHeader } from "./components/inbox-header";
import { InboxEmptyView } from "./components/inbox-empty-view";
import ChannelRail from "./components/channel-rail";
import ConversationList from "./components/conversation-list";
import Thread from "./components/thread";

const ARCHIVED = "archived";

export interface InboxModuleProps {
  initialSelectedId?: string;
}

export default function InboxModule({ initialSelectedId }: InboxModuleProps) {
  const {
    filter,
    setFilter,
    accountId: activeAccountId,
    setAccountId,
    selectedId,
    visible,
    counts,
    connected,
    channelFilter,
    scopedAccounts,
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
  } = useInboxController({ initialSelectedId });

  return (
    <div className="flex h-[100dvh] flex-col bg-canvas text-ink selection:bg-ink selection:text-on-primary">
      {/* 48px Geist Navbar */}
      <InboxHeader onBackToRoot={back} />

      <div className="flex min-h-0 flex-1">
        {/* Conversations Sidebar */}
        <aside
          className={`min-h-0 w-full shrink-0 border-r border-hairline bg-canvas md:flex md:w-[380px] ${
            selectedId ? "hidden" : "flex"
          }`}
        >
          <ChannelRail
            value={filter}
            onChange={setFilter}
            counts={counts}
            connected={connected}
          />

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
            </div>

            <ConversationList
              conversations={visible}
              selectedId={selectedId}
              onSelect={select}
              loading={loadingList}
            />
          </div>
        </aside>

        {/* Conversation Thread / Empty View */}
        {detail ? (
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Thread
              conversation={detail.conversation}
              messages={detail.messages}
              onBack={back}
              onSend={handleSend}
              onSchedule={handleSchedule}
              onNote={handleNote}
              onArchive={handleArchive}
              onMeta={handleMeta}
            />
          </main>
        ) : (
          <InboxEmptyView selectedId={selectedId} loadingThread={loadingThread} />
        )}
      </div>
    </div>
  );
}