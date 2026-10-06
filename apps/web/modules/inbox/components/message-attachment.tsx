"use client";

import type { Message } from "@/core/types";
import { resolveMediaUrl } from "@/core/utils/media";

interface MessageAttachmentProps {
  message: Message;
  onOpenImage: (url: string) => void;
}

export function MessageAttachment({ message, onOpenImage }: MessageAttachmentProps) {
  // `media[]` is canonical; the single-URL mediaUrl field was retired from the
  // Message contract, so there is no legacy branch to honour here.
  const mediaList = message.media && message.media.length > 0 ? message.media : [];

  if (mediaList.length === 0) return null;

  if (mediaList.length === 1) {
    const item = mediaList[0];
    const type = item.type || message.type;
    const name = item.name || message.text || "Attachment";
    // Slack files are private; resolveMediaUrl routes them through the API.
    const url = resolveMediaUrl(item.url, { channel: message.channel });
    const downloadUrl = resolveMediaUrl(item.url, {
      channel: message.channel,
      download: true,
      name,
    });

    if (type === "sticker") {
      return (
        <div className="block overflow-hidden max-w-[160px] cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Sticker"
            onClick={() => onOpenImage(url)}
            className="max-h-40 w-auto object-contain"
            loading="lazy"
          />
        </div>
      );
    }

    if (type === "image") {
      return (
        <div className="group/media relative block overflow-hidden rounded-[10px] cursor-pointer bg-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={name}
            onClick={() => onOpenImage(url)}
            className="max-h-80 w-full object-cover transition-transform duration-200 group-hover/media:scale-[1.02]"
            loading="lazy"
          />
          <div
            onClick={() => onOpenImage(url)}
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
      return (
        <div className="overflow-hidden rounded-[10px] bg-black/20 max-w-[320px]">
          <video
            src={url}
            controls
            playsInline
            className="max-h-80 w-full rounded-[10px]"
            preload="metadata"
          />
        </div>
      );
    }

    if (type === "audio") {
      return (
        <div className="flex items-center gap-2 rounded-[8px] bg-canvas-elevated p-2 border border-hairline my-1 max-w-[280px]">
          <span className="text-lg">🎵</span>
          <audio src={url} controls className="h-8 w-full min-w-[200px]" />
        </div>
      );
    }

    // Default: document/file
    const ext = name.split(".").pop()?.toUpperCase() || "FILE";
    return (
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="group flex items-center gap-3 rounded-[10px] border border-hairline bg-canvas p-2.5 text-left text-ink transition-colors hover:bg-surface-well"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-hairline bg-canvas-elevated font-mono text-[10px] font-bold text-body">
          {ext.slice(0, 4)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">{name}</p>
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

  // Multi-attachment grid / list
  const allImages = mediaList.every((m) => m.type === "image" || m.mimeType?.startsWith("image/"));
  if (allImages) {
    return (
      <div className={`grid gap-1.5 overflow-hidden rounded-[10px] ${mediaList.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {mediaList.map((m, idx) => {
          const mUrl = resolveMediaUrl(m.url, { channel: message.channel });
          return (
          <div key={idx} className="group/media relative aspect-square overflow-hidden bg-black/10 cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mUrl}
              alt={m.name || `Image ${idx + 1}`}
              onClick={() => onOpenImage(mUrl)}
              className="h-full w-full object-cover transition-transform duration-200 group-hover/media:scale-105"
              loading="lazy"
            />
          </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {mediaList.map((item, idx) => {
        const ext = (item.name || "FILE").split(".").pop()?.toUpperCase() || "FILE";
        return (
          <a
            key={idx}
            href={resolveMediaUrl(item.url, {
              channel: message.channel,
              download: true,
              name: item.name,
            })}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="group flex items-center gap-3 rounded-[10px] border border-hairline bg-canvas p-2 text-left text-ink transition-colors hover:bg-surface-well"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-hairline bg-canvas-elevated font-mono text-[9.5px] font-bold text-body">
              {ext.slice(0, 4)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-ink">{item.name || `Attachment ${idx + 1}`}</p>
            </div>
            <span className="text-[12px] text-mute">↓</span>
          </a>
        );
      })}
    </div>
  );
}
