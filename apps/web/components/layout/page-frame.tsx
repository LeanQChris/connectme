import { auth } from "@clerk/nextjs/server";

import SiteHeader from "@/components/layout/site-header";
import { SiteFooter } from "@/modules/site/components/site-footer";

export const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "support@connectme.app";

export async function PageFrame({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter userId={userId} />
    </div>
  );
}