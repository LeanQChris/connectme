import * as React from "react";
import { cn } from "@/core/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 py-1 text-[13px] text-ink placeholder:text-mute shadow-2xs transition-colors file:border-0 file:bg-transparent file:text-[13px] file:font-medium focus-visible:outline-none focus-visible:border-hairline-strong disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
