import { SchedulingModule } from "@/modules/scheduling";

export const metadata = {
  title: "Scheduling · ConnectMe",
  description: "Schedule posts and replies across your connected channels.",
};

export default function ScheduledPage() {
  return <SchedulingModule />;
}