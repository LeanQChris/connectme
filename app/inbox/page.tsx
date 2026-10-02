import { redirect } from "next/navigation";

import Inbox from "@/components/inbox/inbox";
import { ensureTenantUser, tenantSettings } from "@/lib/tenant";

export const metadata = {
  title: "Inbox · ConnectMe",
};

export default async function InboxPage() {
  const tenant = await ensureTenantUser();

  // New accounts have no channels yet, so send them straight to the setup form.
  if (tenant) {
    const { connected } = await tenantSettings(tenant.userId);
    const hasChannel = Object.values(connected).some(Boolean);
    if (!hasChannel) redirect("/settings");
  }

  return <Inbox />;
}
