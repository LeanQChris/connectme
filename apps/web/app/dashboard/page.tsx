import { DashboardModule } from "@/modules/dashboard";

export const metadata = {
  title: "Dashboard · ConnectMe",
  description:
    "Inbox load, reply-window pressure and scheduling queue health across every connected channel.",
};

export default function DashboardPage() {
  return <DashboardModule />;
}