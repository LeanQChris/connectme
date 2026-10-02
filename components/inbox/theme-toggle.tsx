"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("connectme_theme") as Theme | null;
    if (saved && ["light", "dark", "system"].includes(saved)) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme("system");
    }
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else if (t === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
      }
    }
  }

  function cycleTheme() {
    const next: Theme = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
    setTheme(next);
    localStorage.setItem("connectme_theme", next);
    applyTheme(next);
  }

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-lg border border-hairline bg-surface-2 opacity-50" />
    );
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Current theme: ${theme} (Click to change)`}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-surface-2/80 px-2.5 text-xs font-medium text-ink-secondary transition-all hover:bg-surface hover:text-ink hover:border-hairline-strong shadow-2xs"
    >
      {theme === "dark" ? (
        <>
          <svg className="h-3.5 w-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
          <span className="hidden sm:inline">Dark</span>
        </>
      ) : theme === "light" ? (
        <>
          <svg className="h-3.5 w-3.5 text-amber-500 stroke-current" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5" strokeWidth="2" fill="currentColor" />
            <path strokeLinecap="round" strokeWidth="2" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="hidden sm:inline">Auto</span>
        </>
      )}
    </button>
  );
}
