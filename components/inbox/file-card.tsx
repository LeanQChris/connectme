"use client";

import { useState } from "react";
import type { Channel } from "@/lib/types";
import { getFileTypeInfo, getProxiedMediaUrl } from "@/lib/media";
import { formatTime } from "./format";

interface FileCardProps {
  filename?: string | null;
  mediaUrl?: string | null;
  channel?: Channel;
  createdAt?: string;
  outgoing?: boolean;
  compact?: boolean;
}

function FileTypeIcon({ category, ext }: { category: string; ext: string }) {
  if (category === "pdf") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15h2a1.5 1.5 0 0 0 0-3H9v6" />
        <path d="M15 12h2a2 2 0 0 1 0 4h-2" />
      </svg>
    );
  }

  if (category === "spreadsheet") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
        <path d="M12 13v8" />
      </svg>
    );
  }

  if (category === "archive") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8v13H3V8" />
        <path d="M1 3h22v5H1z" />
        <path d="M10 12h4" />
      </svg>
    );
  }

  if (category === "code") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }

  if (category === "presentation") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h20v14H2z" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 8l3 3 7-7" />
      </svg>
    );
  }

  // Default document
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

export default function FileCard({
  filename,
  mediaUrl,
  channel,
  createdAt,
  outgoing = false,
  compact = false,
}: FileCardProps) {
  const [downloading, setDownloading] = useState(false);
  const displayName = filename && filename !== "[document]" ? filename : "Attached File";
  const typeInfo = getFileTypeInfo(displayName);

  const downloadUrl = mediaUrl
    ? getProxiedMediaUrl(mediaUrl, {
        channel,
        download: true,
        name: displayName,
      })
    : null;

  if (!downloadUrl) {
    return (
      <div className="flex items-center gap-3 rounded-[12px] bg-surface-well p-3 text-[12px] border border-hairline min-w-[220px]">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border ${typeInfo.iconBg}`}>
          <FileTypeIcon category={typeInfo.category} ext={typeInfo.ext} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">{displayName}</p>
          <span className="font-mono text-[10.5px] text-mute">{typeInfo.label}</span>
        </div>
      </div>
    );
  }

  return (
    <a
      href={downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={displayName}
      onClick={() => {
        setDownloading(true);
        setTimeout(() => setDownloading(false), 2500);
      }}
      className={`group relative flex items-center gap-3.5 rounded-[13px] border transition-all duration-200 text-left text-ink select-none ${
        compact ? "p-2.5 max-w-[260px]" : "p-3 max-w-[320px] sm:max-w-[340px]"
      } ${
        outgoing
          ? "bg-canvas-elevated/90 hover:bg-canvas-elevated border-hairline shadow-2xs hover:shadow-sm"
          : "bg-canvas-elevated hover:bg-surface-well border-hairline shadow-2xs hover:shadow-sm"
      }`}
    >
      {/* File Icon Badge with category accent styling */}
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${typeInfo.iconBg}`}
      >
        <FileTypeIcon category={typeInfo.category} ext={typeInfo.ext} />
      </div>

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13px] font-medium text-ink group-hover:text-link transition-colors">
            {displayName}
          </p>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] text-mute">
          <span className={`inline-flex items-center px-1.5 py-0.2 rounded-[4px] border font-bold text-[9px] uppercase tracking-wider ${typeInfo.badgeBg} ${typeInfo.badgeText}`}>
            {typeInfo.ext}
          </span>
          {createdAt && (
            <>
              <span>·</span>
              <span>{formatTime(createdAt)}</span>
            </>
          )}
        </div>
      </div>

      {/* Download Action Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-well border border-hairline text-mute group-hover:bg-primary group-hover:text-on-primary group-hover:border-primary/20 transition-all duration-200 group-hover:shadow-2xs">
        {downloading ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
      </div>
    </a>
  );
}
