"use client";

interface InboxEmptyViewProps {
  selectedId: string | null;
  loadingThread: boolean;
}

export function InboxEmptyView({ selectedId, loadingThread }: InboxEmptyViewProps) {
  return (
    <main
      className={`min-h-0 min-w-0 flex-1 items-center justify-center bg-canvas ${
        selectedId ? "flex" : "hidden md:flex"
      }`}
    >
      <div className="flex flex-col items-center justify-center text-center p-8 max-w-xs">
        <div className="flex h-12 w-12 items-center justify-center rounded-[10px] border border-hairline bg-canvas-elevated text-mute shadow-2xs mb-3">
          <svg className="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
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
  );
}
