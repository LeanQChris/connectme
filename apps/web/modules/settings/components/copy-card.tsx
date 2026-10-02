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
    <div className="rounded-lg border border-hairline bg-surface-well/50 p-3.5 space-y-1.5">
      <p className="text-[12px] font-semibold text-ink">{label}</p>
      <div className="flex items-center justify-between gap-2 rounded-md border border-hairline bg-canvas px-3 py-2">
        <code className="truncate font-mono text-[12px] text-ink select-all">{value}</code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-7 shrink-0 text-[11.5px]"
        >
          {copied ? "✓ Copied" : "Copy"}
        </Button>
      </div>
      {hint && <p className="text-[11px] text-mute">{hint}</p>}
    </div>
  );
});
