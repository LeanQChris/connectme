"use client";

import type { UploadedMedia } from "@/core/types";

interface AttachmentPreviewProps {
  attachment: UploadedMedia;
  onRemove: () => void;
}

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  return (
    <div className="mb-2 flex items-center gap-2.5 rounded-[8px] border border-hairline bg-canvas-elevated p-2 text-[12px] shadow-2xs">
      {attachment.type === "image" ? (
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[6px] border border-hairline bg-surface-well">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachment.url} alt="Preview" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-hairline bg-surface-well text-ink">
          {attachment.type === "video" ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          ) : attachment.type === "audio" ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-ink">{attachment.name}</p>
        <p className="font-mono text-[10.5px] text-mute">
          {(attachment.size / 1024).toFixed(0)} KB · <span className="uppercase">{attachment.type}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove attachment"
        className="flex h-7 w-7 items-center justify-center rounded-[4px] text-mute transition-colors hover:bg-surface-well hover:text-ink cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}
