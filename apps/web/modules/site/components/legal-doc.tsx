import type { ReactNode } from "react";

import { PageFrame } from "@/components/layout/page-frame";
import {
  LegalDocViewer,
  type LegalSection,
  type LegalTakeaway,
} from "./legal-doc-viewer";

export type { LegalSection, LegalTakeaway };

interface LegalDocProps {
  title: string;
  updated: string;
  note?: string;
  activeDoc?: "privacy" | "terms";
  intro?: ReactNode;
  takeaways?: LegalTakeaway[];
  sections: LegalSection[];
}

/**
 * Shared reading surface for the legal documents. Integrates active scroll-spy,
 * keyword search/filtering, copyable anchor links, printable layouts, and
 * executive takeaways.
 */
export function LegalDoc({
  title,
  updated,
  note,
  activeDoc = "privacy",
  intro,
  takeaways,
  sections,
}: LegalDocProps) {
  return (
    <PageFrame>
      <div className="relative overflow-hidden">
        <LegalDocViewer
          title={title}
          updated={updated}
          note={note}
          activeDoc={activeDoc}
          intro={intro}
          takeaways={takeaways}
          sections={sections}
        />
      </div>
    </PageFrame>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 items-start">
          <span
            aria-hidden
            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-hairline-strong"
          />
          <div className="text-[14px] leading-relaxed text-body">{item}</div>
        </li>
      ))}
    </ul>
  );
}

export function LegalStrong({ children }: { children: ReactNode }) {
  return <strong className="font-medium text-ink">{children}</strong>;
}
