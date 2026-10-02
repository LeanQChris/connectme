"use client";

import { usePwa } from "@/core/pwa/use-pwa";

interface PwaInstallButtonProps {
  className?: string;
  variant?: "badge" | "button";
}

export function PwaInstallButton({ className = "", variant = "button" }: PwaInstallButtonProps) {
  const { isInstallable, isStandalone, promptInstall } = usePwa();

  if (!isInstallable || isStandalone) {
    return null;
  }

  if (variant === "badge") {
    return (
      <button
        type="button"
        onClick={promptInstall}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors ${className}`}
        title="Install ConnectMe on your desktop or home screen"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Install App</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={promptInstall}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-accent-ink hover:opacity-90 transition-opacity shadow-sm ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span>Install ConnectMe App</span>
    </button>
  );
}
