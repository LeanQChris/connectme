import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/core/utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[6px] text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-on-primary shadow-xs hover:opacity-90 active:scale-[0.99]",
        primary:
          "bg-primary text-on-primary shadow-xs hover:opacity-90 active:scale-[0.99]",
        secondary:
          "bg-surface-well text-body hover:bg-surface-well/80 hover:text-ink",
        outline:
          "border border-hairline bg-canvas-elevated text-body shadow-2xs hover:bg-surface-well hover:text-ink",
        ghost:
          "text-body hover:bg-surface-well hover:text-ink",
        destructive:
          "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20",
        link:
          "text-link underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 rounded-[5px] px-2 text-[12px]",
        lg: "h-10 rounded-md px-4 text-[14px]",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
