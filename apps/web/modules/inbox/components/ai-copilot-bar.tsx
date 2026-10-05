"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { aiApi } from "../api/ai.api";
import type { AiSuggestion, AiSuggestionTone } from "@connectme/contracts";

interface AiCopilotBarProps {
  conversationId?: string;
  contactName?: string;
  channel?: string;
  lastMessages?: {
    direction: "in" | "out" | "note";
    text?: string | null;
    createdAt?: string;
  }[];
  onSelectSuggestion: (text: string) => void;
}

const TONE_BADGES: Record<AiSuggestionTone, { label: string; style: string }> = {
  helpful: { label: "Direct", style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  empathetic: { label: "Empathetic", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  concise: { label: "Short", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  professional: { label: "Formal", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  friendly: { label: "Friendly", style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
};

export function AiCopilotBar({
  conversationId,
  contactName,
  channel,
  lastMessages,
  onSelectSuggestion,
}: AiCopilotBarProps) {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [noKeyConfigured, setNoKeyConfigured] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    if (!lastMessages || lastMessages.length === 0) return;
    setLoading(true);
    setNoKeyConfigured(false);
    try {
      const results = await aiApi.getSuggestions({
        conversationId,
        contactName,
        channel,
        lastMessages,
      });
      setSuggestions(results);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("No AI API key") || msg.includes("BYOK")) {
        setNoKeyConfigured(true);
      }
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, contactName, channel, lastMessages]);



  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas-elevated px-2.5 py-1 text-[11px] font-medium text-mute hover:text-ink transition-colors shadow-2xs cursor-pointer"
      >
        <span className="text-violet-500">✨</span>
        <span>Show AI Copilot</span>
      </button>
    );
  }

  return (
    <div className="mb-2.5 rounded-[10px] border border-hairline bg-canvas-elevated/70 p-2.5 shadow-2xs backdrop-blur-xs">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider text-mute">
          <span className="text-violet-500 font-bold">✨</span>
          <span className="font-semibold text-ink">AI Copilot</span>
          {loading && <span className="animate-pulse text-violet-500">Generating suggestions…</span>}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={fetchSuggestions}
            disabled={loading}
            title="Regenerate suggestions"
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-mute hover:bg-surface-well hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg
              className={`h-3 w-3 stroke-current ${loading ? "animate-spin text-violet-500" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            title="Minimize Copilot"
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-mute hover:bg-surface-well hover:text-ink transition-colors cursor-pointer"
          >
            <svg className="h-3 w-3 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {noKeyConfigured ? (
        <div className="flex items-center justify-between gap-2 rounded-[8px] border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-[12px] text-body">
          <div className="flex items-center gap-2">
            <span className="text-base">🔑</span>
            <span>Bring Your Own Key (BYOK) to enable AI Smart Replies.</span>
          </div>
          <Link
            href="/settings"
            className="shrink-0 rounded-[6px] bg-violet-600 px-2.5 py-1 text-[11px] font-medium text-white shadow-2xs hover:bg-violet-700 transition-colors"
          >
            Add AI Key →
          </Link>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {suggestions.map((item) => {
            const badge = TONE_BADGES[item.tone] || TONE_BADGES.helpful;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSuggestion(item.text)}
                className="group flex flex-col justify-between rounded-[8px] border border-hairline bg-canvas p-2 text-left transition-all hover:border-violet-500/50 hover:bg-surface-well shadow-2xs cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="truncate text-[11.5px] font-semibold text-ink group-hover:text-violet-600 dark:group-hover:text-violet-400">
                    {item.label}
                  </span>
                  <span className={`rounded-full border px-1.5 py-0.2 font-mono text-[9px] font-medium uppercase ${badge.style}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="line-clamp-2 text-[11.5px] text-mute leading-snug">
                  {item.text}
                </p>
                <span className="mt-1.5 font-mono text-[9.5px] text-violet-500 opacity-0 transition-opacity group-hover:opacity-100">
                  Click to insert ↵
                </span>
              </button>
            );
          })}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-[8px] border border-hairline bg-surface-well/50 p-2" />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between py-1 px-1">
          <p className="text-[12px] text-mute">
            Click suggest to generate 3 AI response options tailored to this conversation.
          </p>
          <button
            type="button"
            onClick={fetchSuggestions}
            className="rounded-[6px] border border-hairline bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-surface-well shadow-2xs transition-colors cursor-pointer"
          >
            ✨ Generate Drafts
          </button>
        </div>
      )}
    </div>
  );
}
