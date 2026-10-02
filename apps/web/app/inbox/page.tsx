import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { InboxModule } from "@/modules/inbox";
import { envConfig } from "@/core/config/env.config";

export const metadata = {
  title: "Inbox · ConnectMe",
};

export default async function InboxPage() {
  const { userId } = await auth();

  // If user is authenticated, check if they have at least one channel configured
  if (userId) {
    try {
      const res = await fetch(`${envConfig.apiUrl}/api/settings`, {
        headers: { "x-tenant-id": userId },
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const connected = data?.settings?.connected || {};
        const hasChannel = Object.values(connected).some(Boolean);
        if (!hasChannel) {
          redirect("/settings");
        }
      }
    } catch (err) {
      // In case API is still starting up or unreachable during SSR, allow page to render
      console.warn("[inbox] could not check channel status via API:", err);
    }
  }

  return <InboxModule />;
}
