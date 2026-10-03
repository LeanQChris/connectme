"use client";

import SiteHeader from "@/components/layout/site-header";

interface InboxHeaderProps {
  onBackToRoot?: () => void;
}

export function InboxHeader({ onBackToRoot }: InboxHeaderProps) {
  return <SiteHeader variant="app" onLogoClick={onBackToRoot} />;
}

export default InboxHeader;
