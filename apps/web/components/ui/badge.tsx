import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/core/utils/cn";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-hairline bg-surface-well text-body",
        secondary:
          "border-transparent bg-canvas-elevated text-ink shadow-2xs",
        destructive:
          "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        outline:
          "border-hairline text-mute",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
