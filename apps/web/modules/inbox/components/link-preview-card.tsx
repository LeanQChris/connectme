"use client";

import { useEffect, useState } from "react";

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export function extractUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : [];
}

export function LinkPreviewCard({ url }: { url: string }) {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/preview-link?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json && !json.error && (json.title || json.description)) {
          setData(json);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url]);

  if (loading || !data) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block overflow-hidden rounded-xl border border-hairline bg-surface-well/50 transition-colors hover:bg-surface-well text-left no-underline"
    >
      {data.image && (
        <div className="relative aspect-video w-full overflow-hidden bg-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.image} alt={data.title || "Preview"} className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3">
        {data.siteName && (
          <span className="block font-mono text-[10px] uppercase tracking-wider text-mute">
            {data.siteName}
          </span>
        )}
        {data.title && (
          <h4 className="mt-0.5 line-clamp-2 text-[13px] font-semibold text-ink leading-snug">
            {data.title}
          </h4>
        )}
        {data.description && (
          <p className="mt-1 line-clamp-2 text-[12px] text-mute leading-relaxed">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}
