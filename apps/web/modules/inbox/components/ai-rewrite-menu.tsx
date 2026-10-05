"use client";

import { useState } from "react";
import { aiApi } from "../api/ai.api";
import type { AiRewriteMode } from "@connectme/contracts";

interface AiRewriteMenuProps {
  text: string;
  onApply: (rewrittenText: string) => void;
  onClose: () => void;
}

const REWRITE_OPTIONS: { mode: AiRewriteMode; label: string; icon: string; desc: string }[] = [
  { mode: "fix_grammar", label: "Fix Grammar & Typos", icon: "✍️", desc: "Corrects spelling and punctuation" },
  { mode: "professional", label: "Make Professional", icon: "👔", desc: "Polished and formal customer tone" },
  { mode: "friendly", label: "Make Friendly", icon: "😊", desc: "Warm and approachable tone" },
  { mode: "concise", label: "Shorten & Direct", icon: "✂️", desc: "Removes fluff, keeps key points" },
  { mode: "expand", label: "Elaborate & Detail", icon: "📖", desc: "Adds clear, helpful explanation" },
  { mode: "translate_es", label: "Translate to Spanish", icon: "🇪🇸", desc: "Natural Latin/Castilian Spanish" },
  { mode: "translate_fr", label: "Translate to French", icon: "🇫🇷", desc: "Polite French phrasing" },
  { mode: "translate_de", label: "Translate to German", icon: "🇩🇪", desc: "Natural German wording" },
  { mode: "translate_zh", label: "Translate to Chinese", icon: "🇨🇳", desc: "Polite Simplified Chinese" },
  { mode: "translate_ja", label: "Translate to Japanese", icon: "🇯🇵", desc: "Polite keigo translation" },
  { mode: "translate_ar", label: "Translate to Arabic", icon: "🇦🇪", desc: "Polite Modern Standard Arabic" },
  { mode: "translate_hi", label: "Translate to Hindi", icon: "🇮🇳", desc: "Polite conversational Hindi" },
  { mode: "translate_pt", label: "Translate to Portuguese", icon: "🇧🇷", desc: "Natural Portuguese phrasing" },
  { mode: "translate_it", label: "Translate to Italian", icon: "🇮🇹", desc: "Polite Italian wording" },
  { mode: "translate_ru", label: "Translate to Russian", icon: "🇷🇺", desc: "Natural Russian phrasing" },
  { mode: "translate_ko", label: "Translate to Korean", icon: "🇰🇷", desc: "Polite Korean phrasing" },
];

export function AiRewriteMenu({ text, onApply, onClose }: AiRewriteMenuProps) {
  const [loadingMode, setLoadingMode] = useState<AiRewriteMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRewrite = async (mode: AiRewriteMode) => {
    if (!text.trim()) {
      setError("Please type a message first to rewrite.");
      return;
    }
    setLoadingMode(mode);
    setError(null);
    try {
      const res = await aiApi.rewrite(text, mode);
      onApply(res.text);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rewrite text.";
      setError(msg);
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <div className="absolute bottom-full mb-2 right-0 z-40 w-72 rounded-xl border border-hairline bg-canvas-elevated p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between px-2 py-1 border-b border-hairline mb-1.5">
        <span className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wider font-semibold text-ink">
          <span className="text-violet-500">✨</span> AI Rewrite & Translate
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-mute hover:text-ink transition-colors cursor-pointer"
        >
          <svg className="h-3.5 w-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-2 rounded-[6px] border border-error/30 bg-error/10 p-2 text-[11px] text-error">
          {error}
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-0.5">
        {REWRITE_OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            type="button"
            disabled={loadingMode !== null}
            onClick={() => void handleRewrite(opt.mode)}
            className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[12px] transition-colors hover:bg-surface-well cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{opt.icon}</span>
              <div>
                <span className="font-medium text-ink block">{opt.label}</span>
                <span className="text-[10px] text-mute block">{opt.desc}</span>
              </div>
            </div>
            {loadingMode === opt.mode && (
              <span className="font-mono text-[10px] text-violet-500 animate-pulse">…</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
