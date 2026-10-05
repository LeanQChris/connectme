"use client";

import React, { useEffect, useState } from "react";
import type { LinkPreviewData } from "@/app/api/link-preview/route";

interface LinkPreviewCardProps {
  url: string;
  outgoing?: boolean;
}

const memoryPreviewCache = new Map<string, LinkPreviewData>();

export default function LinkPreviewCard({ url, outgoing = false }: LinkPreviewCardProps) {
  const [data, setData] = useState<LinkPreviewData | null>(() => memoryPreviewCache.get(url) || null);
  const [loading, setLoading] = useState<boolean>(!memoryPreviewCache.has(url));
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    if (memoryPreviewCache.has(url)) {
      setData(memoryPreviewCache.get(url)!);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load preview");
        return res.json();
      })
      .then((preview: LinkPreviewData) => {
        if (isMounted) {
          memoryPreviewCache.set(url, preview);
          setData(preview);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div
        className={`mt-2 flex items-center gap-3 rounded-[12px] border p-2.5 animate-pulse ${
          outgoing
            ? "border-white/20 bg-white/10"
            : "border-hairline bg-surface-well/60"
        }`}
      >
        <div className="h-12 w-12 shrink-0 rounded-[8px] bg-mute/20" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="h-3 w-3/4 rounded bg-mute/20" />
          <div className="h-2.5 w-1/2 rounded bg-mute/15" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  // 1. Video Player & Embed Cards (YouTube, Loom, Vimeo)
  const isVideo = (data.type === "youtube" || data.type === "loom" || data.type === "vimeo") && Boolean(data.embedUrl);

  if (isVideo) {
    return (
      <div
        className={`mt-2 overflow-hidden rounded-[14px] border shadow-2xs transition-all ${
          outgoing
            ? "border-white/25 bg-black/30 text-white"
            : "border-hairline bg-canvas-elevated text-ink"
        }`}
      >
        {isPlaying ? (
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={data.embedUrl}
              title={data.title || "Video Player"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
            <button
              type="button"
              onClick={() => setIsPlaying(false)}
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white backdrop-blur-md transition-all hover:bg-black hover:scale-105"
              title="Close Player"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            className="group/video relative aspect-video w-full cursor-pointer overflow-hidden bg-black/90"
            onClick={() => setIsPlaying(true)}
          >
            {data.image && !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.image}
                alt={data.title || "Video Thumbnail"}
                onError={() => setImageError(true)}
                className="h-full w-full object-cover transition-transform duration-300 group-hover/video:scale-105 opacity-90 group-hover/video:opacity-100"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-mute">
                <span className="text-3xl">▶</span>
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 pointer-events-none" />

            {/* Platform Badge Top Left */}
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[10.5px] font-medium text-white backdrop-blur-md shadow-sm">
              {data.favicon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.favicon}
                  alt=""
                  className="h-3.5 w-3.5 rounded-[3px] object-contain"
                />
              )}
              <span className="font-mono text-[10px] tracking-wider uppercase">
                {data.siteName || data.type}
              </span>
            </div>

            {/* Center Play Button Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full shadow-lg transition-transform duration-200 group-hover/video:scale-110 active:scale-95 ${
                  data.type === "youtube"
                    ? "bg-[#FF0000] text-white"
                    : data.type === "loom"
                    ? "bg-[#625DF5] text-white"
                    : "bg-primary text-white"
                }`}
              >
                <svg
                  className="h-6 w-6 fill-current translate-x-0.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Bottom Title Bar */}
            <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3 text-left">
              <h4 className="line-clamp-1 text-[12.5px] sm:text-[13px] font-semibold text-white tracking-[-0.01em]">
                {data.title}
              </h4>
              {data.author && (
                <p className="mt-0.5 font-mono text-[10.5px] text-white/80 line-clamp-1">
                  {data.author}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Video Card Footer Actions */}
        <div className="flex items-center justify-between px-3 py-2 text-[11.5px] border-t border-hairline/40">
          <div className="flex items-center gap-1.5 min-w-0">
            {data.favicon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.favicon}
                alt=""
                className="h-3.5 w-3.5 rounded-[2px] object-contain shrink-0"
              />
            )}
            <span className="font-mono text-[10.5px] truncate opacity-80">
              {data.siteName || "Video"}
            </span>
          </div>
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center gap-1 font-medium hover:underline text-[11px] ${
              outgoing ? "text-white hover:text-white/90" : "text-link hover:text-link/80"
            }`}
          >
            <span>Open in {data.siteName || "browser"}</span>
            <span>↗</span>
          </a>
        </div>
      </div>
    );
  }

  // 2. Generic OpenGraph Rich Link Card
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`mt-2 block overflow-hidden rounded-[12px] border text-left transition-all hover:shadow-xs group/link ${
        outgoing
          ? "border-white/25 bg-black/25 text-white hover:bg-black/35"
          : "border-hairline bg-surface-well/50 text-ink hover:bg-surface-well hover:border-hairline-strong"
      }`}
    >
      <div className="flex items-stretch">
        <div className="flex-1 p-2.5 sm:p-3 min-w-0">
          {/* Site Badge */}
          <div className="flex items-center gap-1.5 mb-1 text-[11px] opacity-75">
            {data.favicon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.favicon}
                alt=""
                className="h-3.5 w-3.5 rounded-[2px] object-contain shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            )}
            <span className="font-mono text-[10.5px] truncate font-medium">
              {data.siteName || new URL(data.url).hostname.replace(/^www\./, "")}
            </span>
          </div>

          {/* Title */}
          <h4 className="line-clamp-2 text-[12.5px] sm:text-[13px] font-semibold leading-snug tracking-[-0.01em] group-hover/link:underline">
            {data.title || data.url}
          </h4>

          {/* Description */}
          {data.description && (
            <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed opacity-75">
              {data.description}
            </p>
          )}
        </div>

        {/* Thumbnail Image (Right Side) */}
        {data.image && !imageError && (
          <div className="relative w-24 sm:w-28 shrink-0 overflow-hidden bg-black/5 border-l border-hairline/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.image}
              alt={data.title || ""}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover/link:scale-105"
              loading="lazy"
            />
          </div>
        )}
      </div>
    </a>
  );
}
