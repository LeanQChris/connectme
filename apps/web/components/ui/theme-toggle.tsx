"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY, type Theme } from "@/core/theme/theme";

const THEMES: Theme[] = ["light", "dark", "system"];

function snapshot(): Theme {
  const value = localStorage.getItem(THEME_KEY);
  return THEMES.includes(value as Theme) ? (value as Theme) : "system";
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_KEY, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_KEY, onChange);
  };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "system");

  function cycleTheme() {
    const next: Theme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_KEY));
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Theme: ${theme} (Click to toggle)`}
      className="flex h-8 items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas-elevated px-2.5 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink shadow-2xs"
    >
      {theme === "dark" ? (
        <>
          <svg className="h-3.5 w-3.5 text-ink fill-current" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
          <span className="hidden sm:inline">Dark</span>
        </>
      ) : theme === "light" ? (
        <>
          <svg className="h-3.5 w-3.5 text-ink stroke-current" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" strokeWidth="2" fill="currentColor" />
            <path strokeLinecap="round" strokeWidth="2" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42 1.42" />
          </svg>
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5 text-body stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Auto</span>
        </>
      )}
    </button>
  );
}
