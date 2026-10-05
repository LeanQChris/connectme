"use client";

import { useState, useEffect, useCallback } from "react";
import { whatsappTemplateApi } from "../api/whatsapp-template.api";
import type { WhatsAppTemplateDto, WhatsAppTemplateCategory } from "@connectme/contracts";
import { Button } from "@/components/ui/button";

interface WhatsAppTemplatePickerModalProps {
  conversationId: string;
  contactName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORY_COLORS: Record<WhatsAppTemplateCategory, string> = {
  UTILITY: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  MARKETING: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  AUTHENTICATION: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

export function WhatsAppTemplatePickerModal({
  conversationId,
  contactName,
  isOpen,
  onClose,
  onSuccess,
}: WhatsAppTemplatePickerModalProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateDto | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Variable inputs
  const [bodyVariables, setBodyVariables] = useState<string[]>([]);
  const [headerVariables, setHeaderVariables] = useState<string[]>([]);
  const selectTemplate = useCallback(
    (tmpl: WhatsAppTemplateDto) => {
      setSelectedTemplate(tmpl);
      const bodyComp = tmpl.components.find((c) => c.type === "BODY");
      if (bodyComp?.text) {
        const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g) || [];
        const count = matches.length;
        const initialVars = new Array(count).fill("");
        if (initialVars.length > 0 && contactName) {
          initialVars[0] = contactName;
        }
        setBodyVariables(initialVars);
      } else {
        setBodyVariables([]);
      }

      const headerComp = tmpl.components.find((c) => c.type === "HEADER");
      if (headerComp?.text && headerComp.text.includes("{{1}}")) {
        setHeaderVariables([""]);
      } else {
        setHeaderVariables([]);
      }
    },
    [contactName],
  );

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    whatsappTemplateApi
      .listTemplates()
      .then((res) => {
        if (!isMounted) return;
        setTemplates(res);
        if (res.length > 0) {
          selectTemplate(res[0]);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load templates");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectTemplate]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await whatsappTemplateApi.syncTemplates();
      setTemplates(res.templates);
      if (res.templates.length > 0) {
        selectTemplate(res.templates[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;
    setSending(true);
    setError(null);
    try {
      await whatsappTemplateApi.sendTemplate({
        conversationId,
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language,
        headerVariables: headerVariables.length > 0 ? headerVariables : undefined,
        bodyVariables: bodyVariables.length > 0 ? bodyVariables : undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send template");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.components.some((c) => c.text?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const bodyComp = selectedTemplate?.components.find((c) => c.type === "BODY");
  const headerComp = selectedTemplate?.components.find((c) => c.type === "HEADER");
  const footerComp = selectedTemplate?.components.find((c) => c.type === "FOOTER");
  const buttonComp = selectedTemplate?.components.find((c) => c.type === "BUTTONS");

  // Render preview text with variables replaced
  let previewBodyText = bodyComp?.text || "";
  bodyVariables.forEach((val, idx) => {
    const replacement = val.trim() ? val : `[Variable ${idx + 1}]`;
    previewBodyText = previewBodyText.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, "g"), replacement);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex h-[620px] w-full max-w-4xl flex-col rounded-2xl border border-hairline bg-canvas-elevated shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              💬
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-ink">
                Send Approved WhatsApp Template
              </h2>
              <p className="text-[12px] text-mute">
                Required when 24h customer messaging window is closed, or to send structured business updates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={handleSync}
              className="h-8 text-[11.5px] cursor-pointer"
            >
              {syncing ? "Syncing…" : "🔄 Sync from Meta"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-mute hover:bg-surface-well hover:text-ink cursor-pointer transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 rounded-lg border border-error/30 bg-error/10 p-2.5 text-[12px] text-error">
            {error}
          </div>
        )}

        {/* Content Body: 2 Columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Template List */}
          <div className="flex w-2/5 flex-col border-r border-hairline bg-canvas/50 p-4">
            {/* Search and Filters */}
            <div className="space-y-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates…"
                className="h-8 w-full rounded-lg border border-hairline bg-canvas px-2.5 text-[12px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
              />
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {["ALL", "UTILITY", "MARKETING", "AUTHENTICATION"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-ink text-canvas shadow-2xs font-semibold"
                        : "bg-surface-well text-mute hover:text-ink"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Items */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {loading ? (
                <div className="space-y-2 pt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl border border-hairline bg-surface-well/50" />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="p-4 text-center text-[12px] text-mute">
                  No templates found.
                </div>
              ) : (
                filteredTemplates.map((t) => {
                  const isSelected = selectedTemplate?.id === t.id;
                  const catStyle = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.UTILITY;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectTemplate(t)}
                      className={`flex w-full flex-col rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 shadow-2xs ring-1 ring-emerald-500/30"
                          : "border-hairline bg-canvas hover:border-ink hover:bg-surface-well"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono text-[11.5px] font-semibold text-ink truncate">
                          {t.name}
                        </span>
                        <span className={`rounded-full border px-1.5 py-0.2 font-mono text-[9px] uppercase ${catStyle}`}>
                          {t.category}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[11px] text-mute leading-snug">
                        {t.components.find((c) => c.type === "BODY")?.text || "No body preview"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Template Customization & Live Preview */}
          <div className="flex w-3/5 flex-col p-6 overflow-y-auto">
            {selectedTemplate ? (
              <div className="space-y-5">
                {/* Template Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-mono text-[14px] font-semibold text-ink">
                      {selectedTemplate.name}
                    </h3>
                    <span className="font-mono text-[11px] text-mute">
                      Language: {selectedTemplate.language} • Status: {selectedTemplate.status}
                    </span>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase font-semibold ${CATEGORY_COLORS[selectedTemplate.category]}`}>
                    {selectedTemplate.category}
                  </span>
                </div>

                {/* Variable Inputs */}
                {bodyVariables.length > 0 && (
                  <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-3">
                    <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-ink">
                      Fill Template Placeholders
                    </label>
                    <div className="space-y-2">
                      {bodyVariables.map((val, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="shrink-0 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                            {`{{${idx + 1}}}`}
                          </span>
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => {
                              const updated = [...bodyVariables];
                              updated[idx] = e.target.value;
                              setBodyVariables(updated);
                            }}
                            placeholder={`Value for {{${idx + 1}}} (e.g. Customer Name, Order ID)`}
                            className="h-9 flex-1 rounded-lg border border-hairline bg-canvas-elevated px-3 text-[12.5px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Message Preview Box */}
                <div>
                  <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-ink mb-1.5">
                    Live WhatsApp Message Preview
                  </label>
                  <div className="rounded-2xl border border-hairline bg-[#EFEAE2] dark:bg-[#111B21] p-4 shadow-inner">
                    <div className="max-w-[85%] rounded-xl bg-white dark:bg-[#202C33] p-3 shadow-xs space-y-1.5">
                      {/* Header */}
                      {headerComp?.text && (
                        <div className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">
                          {headerComp.text}
                        </div>
                      )}

                      {/* Body */}
                      <div className="text-[12.5px] text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {previewBodyText}
                      </div>

                      {/* Footer */}
                      {footerComp?.text && (
                        <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                          {footerComp.text}
                        </div>
                      )}

                      {/* Buttons */}
                      {buttonComp?.buttons && buttonComp.buttons.length > 0 && (
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-1">
                          {buttonComp.buttons.map((b, i) => (
                            <div
                              key={i}
                              className="w-full text-center py-1 rounded bg-zinc-100 dark:bg-[#2A3942] font-medium text-[12px] text-emerald-600 dark:text-emerald-400 shadow-2xs"
                            >
                              {b.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={sending}
                    onClick={handleSend}
                    className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm cursor-pointer"
                  >
                    {sending ? "Sending…" : "🚀 Send WhatsApp Template"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-mute text-[13px]">
                Select a template from the list to preview and customize.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
