"use client";

import Link from "next/link";
import React, { useEffect, useState, useMemo } from "react";
import { cn } from "@/core/utils/cn";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
  tags?: string[];
}

export interface LegalTakeaway {
  title: string;
  desc: string;
}

export interface LegalDocViewerProps {
  title: string;
  updated: string;
  note?: string;
  activeDoc: "privacy" | "terms";
  intro?: React.ReactNode;
  takeaways?: LegalTakeaway[];
  sections: LegalSection[];
}

export function LegalDocViewer({
  title,
  updated,
  note,
  activeDoc,
  intro,
  takeaways,
  sections,
}: LegalDocViewerProps) {
  const [activeSectionId, setActiveSectionId] = useState<string>(
    sections[0]?.id || "",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Scroll spy to highlight active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSectionId(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  // Search filtering
  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sections;
    return sections.filter((section) => {
      const matchesTitle = section.title.toLowerCase().includes(query);
      const matchesId = section.id.toLowerCase().includes(query);
      const matchesTags = section.tags?.some((t) =>
        t.toLowerCase().includes(query),
      );
      return matchesTitle || matchesId || matchesTags;
    });
  }, [sections, searchQuery]);

  const copyAnchor = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="relative">
      {/* Top Document Header & Tabs */}
      <div className="border-b border-hairline bg-canvas-elevated">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:pt-14 sm:pb-10">
          {/* Doc Switcher Tabs */}
          <div className="flex items-center gap-2">
            <Link
              href="/privacy"
              className={cn(
                "rounded-full px-3.5 py-1 text-[12px] font-medium transition-colors",
                activeDoc === "privacy"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "border border-hairline bg-canvas text-mute hover:text-ink",
              )}
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className={cn(
                "rounded-full px-3.5 py-1 text-[12px] font-medium transition-colors",
                activeDoc === "terms"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "border border-hairline bg-canvas text-mute hover:text-ink",
              )}
            >
              Terms of Service
            </Link>
          </div>

          <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] text-ink sm:text-[44px]">
                {title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[11px] text-mute">
                <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-hairline bg-surface-well px-2 py-0.5 uppercase tracking-wider text-ink font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Policy
                </span>
                <span>Last updated {updated}</span>
                {note && <span>· {note}</span>}
                <span>· ~5 min read</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-hairline bg-canvas px-3 text-[12px] font-medium text-body transition-colors hover:bg-surface-well hover:text-ink"
                title="Print this document"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        {/* Key Takeaways Cards */}
        {takeaways && takeaways.length > 0 && (
          <div className="mb-12">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
              Summary at a glance
            </h2>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {takeaways.map((item, i) => (
                <div
                  key={i}
                  className="rounded-[12px] border border-hairline bg-canvas-elevated p-4 shadow-2xs transition-all hover:border-hairline-strong"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-well font-mono text-[10px] font-semibold text-ink">
                      0{i + 1}
                    </span>
                    <h3 className="text-[13px] font-semibold text-ink tracking-tight">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-body">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.3fr)_minmax(0,0.7fr)] lg:gap-16">
          {/* Sticky Left Navigation Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-5">
              {/* Search / Filter Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter sections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-[8px] border border-hairline bg-canvas-elevated px-3 py-1.5 pl-8 text-[12px] text-ink placeholder:text-mute focus:border-ink focus:outline-none"
                />
                <svg
                  className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-mute"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-[11px] text-mute hover:text-ink"
                  >
                    \u2715
                  </button>
                )}
              </div>

              {/* Table of Contents */}
              <nav aria-label="Table of contents">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">
                    Table of contents
                  </p>
                  <span className="font-mono text-[10px] text-faint">
                    {filteredSections.length} of {sections.length}
                  </span>
                </div>

                <ol className="mt-3.5 max-h-[calc(100vh-260px)] space-y-1 overflow-y-auto border-l border-hairline pr-2 text-[12.5px]">
                  {filteredSections.map((section, idx) => {
                    const isActive = activeSectionId === section.id;
                    return (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          className={cn(
                            "-ml-px block border-l py-1 pl-3.5 transition-colors",
                            isActive
                              ? "border-ink font-semibold text-ink"
                              : "border-transparent text-mute hover:border-hairline-strong hover:text-ink",
                          )}
                        >
                          <span className="mr-1.5 font-mono text-[10.5px] tabular-nums text-faint">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          {section.title}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </div>
          </aside>

          {/* Right Main Legal Prose */}
          <article className="min-w-0">
            {intro && (
              <div className="rounded-[12px] border border-hairline bg-canvas-elevated p-5 text-[14.5px] leading-relaxed text-body shadow-2xs">
                {intro}
              </div>
            )}

            {/* Mobile section jump dropdown */}
            <div className="mt-6 lg:hidden">
              <label
                htmlFor="mobile-toc"
                className="font-mono text-[11px] uppercase tracking-wider text-mute block mb-1.5"
              >
                Jump to clause:
              </label>
              <select
                id="mobile-toc"
                value={activeSectionId}
                onChange={(e) => {
                  const target = document.getElementById(e.target.value);
                  if (target) {
                    target.scrollIntoView({ behavior: "smooth" });
                    setActiveSectionId(e.target.value);
                  }
                }}
                className="w-full rounded-[8px] border border-hairline bg-canvas-elevated px-3 py-2 text-[13px] text-ink focus:border-ink focus:outline-none"
              >
                {sections.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {String(i + 1).padStart(2, "0")}. {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-10 space-y-12 sm:space-y-14">
              {filteredSections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="group relative scroll-mt-20 border-b border-hairline pb-10 last:border-b-0"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[11px] font-semibold text-mute">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink sm:text-[22px]">
                        {section.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyAnchor(section.id)}
                      className="inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] font-mono text-mute transition-colors hover:bg-surface-well hover:text-ink opacity-60 group-hover:opacity-100"
                      title="Copy link to this section"
                    >
                      {copiedId === section.id ? (
                        <span className="text-emerald-500 font-semibold">
                          Copied!
                        </span>
                      ) : (
                        <>
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                          <span className="hidden sm:inline">Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 space-y-3.5 text-[14px] leading-relaxed text-body">
                    {section.body}
                  </div>
                </section>
              ))}

              {filteredSections.length === 0 && (
                <div className="rounded-[12px] border border-dashed border-hairline p-8 text-center">
                  <p className="text-[13px] text-mute">
                    No clauses found matching &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-3 text-[12px] font-medium text-link hover:underline"
                  >
                    Clear filter
                  </button>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
