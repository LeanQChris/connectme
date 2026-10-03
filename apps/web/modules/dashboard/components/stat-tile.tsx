import Link from "next/link";
import { cn } from "@/core/utils/cn";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "error";
  href?: string;
}

export function StatTile({ label, value, hint, tone = "default", href }: StatTileProps) {
  const valueTone =
    tone === "error"
      ? "text-error"
      : tone === "warning"
        ? "text-warning"
        : "text-ink";

  const body = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wider text-mute">{label}</p>
      <p className={cn("mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.03em]", valueTone)}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11.5px] text-mute">{hint}</p>}
    </>
  );

  const className =
    "block rounded-xl border border-hairline bg-canvas-elevated p-4 shadow-2xs transition-colors";

  if (href) {
    return (
      <Link href={href} className={cn(className, "hover:bg-surface-well")}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}