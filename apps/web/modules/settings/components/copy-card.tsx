"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";

interface CopyCardProps {
  label: string;
  value: string;
  hint?: string;
}

export const CopyCard = memo(function CopyCard({ label, value, hint }: CopyCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-hairline bg-canvas p-4 transition-all hover:border-hairline-strong shadow-2xs space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] font-semibold text-ink">{label}</p>
        {copied && (
          <span className="font-mono text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Copied to clipboard!
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-surface-well/60 px-3.5 py-2.5 font-mono text-[12px]">
        <code className="truncate text-ink select-all">{value}</code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className={`h-7 shrink-0 text-[11.5px] font-medium transition-all ${
            copied
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "hover:bg-canvas-elevated hover:text-ink"
          }`}
        >
          {copied ? (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </span>
          )}
        </Button>
      </div>
      {hint && <p className="text-[11px] text-mute leading-relaxed">{hint}</p>}
    </div>
  );
});
