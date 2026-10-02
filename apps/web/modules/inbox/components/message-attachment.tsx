"use client";

import type { Message } from "@/core/types";

interface MessageAttachmentProps {
  message: Message;
  onOpenImage: (url: string) => void;
}

export function MessageAttachment({ message, onOpenImage }: MessageAttachmentProps) {
  const { mediaUrl, type } = message;

  if (type === "image") {
    if (!mediaUrl) {
      return (
        <div className="flex items-center gap-2.5 rounded-[8px] bg-surface-well p-2.5 text-[12px] border border-hairline">
          <span className="text-xl">🖼️</span>
          <div>
            <p className="font-medium text-ink">Photo Attachment</p>
            <span className="text-[10.5px] text-mute font-mono">Image received</span>
          </div>
        </div>
      );
    }
    return (
      <div className="group/media relative block overflow-hidden rounded-[10px] cursor-pointer bg-black/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt="Attachment"
          onClick={() => onOpenImage(mediaUrl)}
          className="max-h-80 w-full object-cover transition-transform duration-200 group-hover/media:scale-[1.02]"
          loading="lazy"
        />
        <div
          onClick={() => onOpenImage(mediaUrl)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/media:bg-black/25"
        >
          <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition-opacity group-hover/media:opacity-100 flex items-center gap-1.5 backdrop-blur-sm">
            <span>View Full Size</span>
            <span>↗</span>
          </span>
        </div>
      </div>
    );
  }

  if (type === "video") {
    if (!mediaUrl) {
      return (
        <div className="flex items-center gap-3 rounded-[8px] bg-surface-well p-2.5 text-[12px] border border-hairline min-w-[180px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-canvas-elevated text-lg border border-hairline">
            🎥
          </div>
          <div>
            <p className="font-medium text-[13px] text-ink">
              {message.text && message.text !== "[video]" ? message.text : "Video message"}
            </p>
            <span className="text-[10.5px] text-mute font-mono">Video attachment</span>
          </div>
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-[10px] bg-black/20 max-w-[320px]">
        <video
          src={mediaUrl}
          controls
          playsInline
          className="max-h-80 w-full rounded-[10px]"
          preload="metadata"
        />
      </div>
    );
  }

  if (type === "audio") {
    if (!mediaUrl) {
      return (
        <div className="flex items-center gap-2.5 rounded-[8px] bg-surface-well p-2 text-[12px] border border-hairline">
          <span className="text-lg">🎤</span>
          <div>
            <p className="font-medium text-ink">Voice / Audio message</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 rounded-[8px] bg-canvas-elevated p-2 border border-hairline my-1 max-w-[280px]">
        <span className="text-lg">🎵</span>
        <audio src={mediaUrl} controls className="h-8 w-full min-w-[200px]" />
      </div>
    );
  }

  if (type === "document" || (!mediaUrl && type !== "text")) {
    const filename =
      message.text && message.text !== "[document]" ? message.text : "Attached Document";
    const ext = filename.split(".").pop()?.toUpperCase() || "DOC";

    if (!mediaUrl) {
      return (
        <div className="flex items-center gap-3 rounded-[8px] bg-surface-well p-2.5 text-[12px] border border-hairline min-w-[180px]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-hairline bg-canvas-elevated font-mono text-[10px] font-bold text-body">
            {ext.slice(0, 4)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{filename}</p>
            <span className="font-mono text-[10.5px] text-mute">File attachment</span>
          </div>
        </div>
      );
    }

    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="group flex items-center gap-3 rounded-[10px] border border-hairline bg-canvas p-2.5 text-left text-ink transition-colors hover:bg-surface-well"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-hairline bg-canvas-elevated font-mono text-[10px] font-bold text-body">
          {ext.slice(0, 4)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">{filename}</p>
          <span className="font-mono text-[10.5px] text-mute flex items-center gap-1">
            <span>Download file</span>
            <span>↓</span>
          </span>
        </div>
        <svg
          className="h-4 w-4 shrink-0 text-mute transition-transform group-hover:translate-y-0.5 group-hover:text-ink"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      </a>
    );
  }

  return null;
}
