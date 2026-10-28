"use client";

import { useState, useEffect } from "react";
import { whatsappTemplateApi } from "@/modules/inbox/api/whatsapp-template.api";
import type { WhatsAppTemplateDto, WhatsAppTemplateCategory } from "@connectme/contracts";
import { Button } from "@/components/ui/button";

const CATEGORY_BADGES: Record<WhatsAppTemplateCategory, string> = {
  UTILITY: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  MARKETING: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  AUTHENTICATION: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

export function WhatsAppTemplateManager() {
  const [templates, setTemplates] = useState<WhatsAppTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [draftLanguage, setDraftLanguage] = useState("en_US");
  const [headerExamples, setHeaderExamples] = useState("");
  const [bodyExamples, setBodyExamples] = useState("");

  const handleSubmit = async (id: string) => {
    setSubmitting(id);
    setError(null);
    setSuccess(null);
    try {
      const { template } = await whatsappTemplateApi.submitTemplate(id);
      setTemplates((prev) => prev.map((t) => t.id === id ? template : t));
      setSuccess("Submitted to Meta for review. Sync later to check approval.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      const list = await whatsappTemplateApi.listTemplates().catch(() => null);
      if (list) setTemplates(list);
    } finally { setSubmitting(null); }
  };

  // New Draft form
  const [draftName, setDraftName] = useState("");
  const [draftCategory, setDraftCategory] = useState<WhatsAppTemplateCategory>("UTILITY");
  const [draftHeaderText, setDraftHeaderText] = useState("");
  const [draftBodyText, setDraftBodyText] = useState("");
  const [draftFooterText, setDraftFooterText] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    let isMounted = true;
    whatsappTemplateApi
      .listTemplates()
      .then((list) => {
        if (isMounted) {
          setTemplates(list);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load templates");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await whatsappTemplateApi.syncTemplates();
      setTemplates(res.templates);
      setSuccess(`Successfully synced ${res.syncedCount} templates from Meta Cloud API!`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftName.trim() || !draftBodyText.trim()) return;

    setSavingDraft(true);
    setError(null);
    try {
      const dto = {
        name: draftName.trim().toLowerCase().replace(/\s+/g, "_"),
        language: draftLanguage,
        headerExamples: headerExamples.trim() ? headerExamples.split("\n").map((v) => v.trim()) : undefined,
        bodyExamples: bodyExamples.trim() ? bodyExamples.split("\n").map((v) => v.trim()) : undefined,
        category: draftCategory,
        headerText: draftHeaderText.trim() || undefined,
        bodyText: draftBodyText.trim(),
        footerText: draftFooterText.trim() || undefined,
      };
      const res = editingId ? await whatsappTemplateApi.updateDraft(editingId, dto) : await whatsappTemplateApi.createDraft(dto);
      setTemplates((prev) => editingId ? prev.map((t) => t.id === editingId ? res.template : t) : [res.template, ...prev]);
      setEditingId(null);
      setShowCreateModal(false);
      setDraftName("");
      setDraftHeaderText("");
      setDraftBodyText("");
      setDraftFooterText("");
      setHeaderExamples("");
      setBodyExamples("");
      setSuccess("Template draft saved successfully!");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create template draft");
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="rounded-xl border border-hairline bg-canvas-elevated p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-ink">
              WhatsApp Message Templates (HSM)
            </h3>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {templates.length} Templates
            </span>
          </div>
          <p className="text-[12.5px] text-mute mt-0.5">
            Save a text template draft, submit it to Meta, then sync to confirm approval before sending. Manage rejected, authentication, media and button templates in Meta WhatsApp Manager.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={handleSync}
            className="h-8 text-[12px] cursor-pointer"
          >
            {syncing ? "Syncing…" : "🔄 Sync from Meta"}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => { setEditingId(null); setDraftName(""); setDraftLanguage("en_US"); setDraftCategory("UTILITY"); setDraftHeaderText(""); setDraftBodyText(""); setDraftFooterText(""); setHeaderExamples(""); setBodyExamples(""); setShowCreateModal(true); }}
            className="h-8 text-[12px] bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
          >
            + Create Template
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-error/30 bg-error/10 p-3.5 text-[12.5px] text-error flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="cursor-pointer">✕</button>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-[12.5px] text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <span>✓ {success}</span>
          <button type="button" onClick={() => setSuccess(null)} className="cursor-pointer">✕</button>
        </div>
      )}

      {/* Template Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-hairline bg-surface-well/50" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="py-8 text-center text-mute text-[13px]">
          No WhatsApp templates configured yet. Click Sync from Meta or Create Template above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tmpl) => {
            const bodyComp = tmpl.components.find((c) => c.type === "BODY");
            const headerComp = tmpl.components.find((c) => c.type === "HEADER");
            const footerComp = tmpl.components.find((c) => c.type === "FOOTER");
            const buttonComp = tmpl.components.find((c) => c.type === "BUTTONS");
            const catBadge = CATEGORY_BADGES[tmpl.category] || CATEGORY_BADGES.UTILITY;

            return (
              <div
                key={tmpl.id}
                className="flex flex-col justify-between rounded-xl border border-hairline bg-canvas p-4 shadow-2xs hover:border-hairline-strong transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[13px] font-semibold text-ink">
                      {tmpl.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.2 font-mono text-[9.5px] uppercase ${catBadge}`}>
                        {tmpl.category}
                      </span>
                      <span className={`rounded-full border px-2 py-0.2 font-mono text-[9.5px] ${tmpl.status === "APPROVED" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" : tmpl.status === "REJECTED" ? "bg-error/10 border-error/20 text-error" : "bg-surface-well border-hairline text-body"}`}>
                        {tmpl.status}
                      </span>
                    </div>
                  </div>

                  {tmpl.rejectionReason && <p className="text-[12px] text-error">{tmpl.rejectionReason}</p>}
                  {tmpl.status === "SUBMITTED" && <p className="text-[12px] text-mute">Submission unconfirmed. Sync from Meta before retrying.</p>}
                  {headerComp?.text && (
                    <div className="text-[12px] font-bold text-ink">
                      {headerComp.text}
                    </div>
                  )}

                  <p className="text-[12.5px] text-body leading-relaxed bg-surface-well/50 rounded-lg p-3 font-sans whitespace-pre-wrap">
                    {bodyComp?.text || "No body text"}
                  </p>

                  {footerComp?.text && (
                    <span className="text-[11px] text-mute block">
                      {footerComp.text}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5 font-mono text-[10.5px] text-mute">
                  <span>Language: {tmpl.language}</span>
                  {tmpl.status === "DRAFT" && !tmpl.providerId && (
                    <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => {
                      setEditingId(tmpl.id); setDraftName(tmpl.name); setDraftLanguage(tmpl.language); setDraftCategory(tmpl.category);
                      setDraftHeaderText(headerComp?.text || ""); setDraftBodyText(bodyComp?.text || ""); setDraftFooterText(footerComp?.text || "");
                      setHeaderExamples((headerComp?.example?.header_text as string[] | undefined)?.join("\n") || "");
                      setBodyExamples((bodyComp?.example?.body_text as string[][] | undefined)?.[0]?.join("\n") || "");
                      setError(null); setShowCreateModal(true);
                    }}>Edit draft</Button>
                    <Button type="button" size="sm" disabled={submitting !== null} onClick={() => handleSubmit(tmpl.id)}>
                      {submitting === tmpl.id ? "Submitting…" : "Submit to Meta"}
                    </Button>
                    </div>
                  )}
                  {buttonComp?.buttons && buttonComp.buttons.length > 0 && (
                    <span>{buttonComp.buttons.length} Quick Reply Buttons</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-hairline bg-canvas-elevated p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="text-[15px] font-semibold text-ink">{editingId ? "Edit draft" : "Create WhatsApp Template"}</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-mute hover:text-ink cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="space-y-4 max-h-[75vh] overflow-y-auto">
              {error && <p role="alert" className="text-sm text-error">{error}</p>}
              <label className="block text-[12px] font-semibold text-ink">Language code
                <input disabled={Boolean(editingId)} required value={draftLanguage} onChange={(e) => setDraftLanguage(e.target.value)} placeholder="en_US" className="mt-1 h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-ink" />
              </label>
              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1">
                  Template Name (lowercase with underscores)
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingId)}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. order_shipment_notice"
                  className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink font-mono placeholder:text-mute focus:border-ink/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1">
                  Category
                </label>
                <select
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value as WhatsAppTemplateCategory)}
                  className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink focus:border-ink/50 focus:outline-none"
                >
                  <option value="UTILITY">UTILITY (Order, Account, Support updates)</option>
                  <option value="MARKETING">MARKETING (Offers, announcements)</option>

                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1">
                  Header Text <span className="text-mute font-normal text-[11px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={draftHeaderText}
                  onChange={(e) => setDraftHeaderText(e.target.value)}
                  placeholder="e.g. Order Update"
                  className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1">
                  Body Text (Use {"{{1}}"}, {"{{2}}"} for parameters)
                </label>
                <textarea
                  rows={4}
                  required
                  value={draftBodyText}
                  onChange={(e) => setDraftBodyText(e.target.value)}
                  placeholder="Hi {{1}}, your order {{2}} has shipped!"
                  className="w-full rounded-lg border border-hairline bg-canvas p-3 text-[13px] text-ink placeholder:text-mute focus:border-ink/50 focus:outline-none leading-relaxed resize-y"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-ink mb-1">
                  Footer Text <span className="text-mute font-normal text-[11px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={draftFooterText}
                  onChange={(e) => setDraftFooterText(e.target.value)}
                  placeholder="e.g. Reply STOP to opt out"
                  className="h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-ink/50 focus:outline-none"
                />
              </div>

              <label className="block text-[12px] font-semibold text-ink">Header variable example (if used)
                <input value={headerExamples} onChange={(e) => setHeaderExamples(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-ink" />
              </label>
              <label className="block text-[12px] font-semibold text-ink">Body variable examples (one per line, in numbered order)
                <textarea value={bodyExamples} onChange={(e) => setBodyExamples(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-hairline bg-canvas p-3 text-ink" />
              </label>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="h-8 px-3 text-[12px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingDraft}
                  className="h-8 px-4 text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                >
                  {savingDraft ? "Saving…" : "Save Template"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
