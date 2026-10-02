import { auth } from "@clerk/nextjs/server";
import { LandingModule } from "@/modules/site";

export const metadata = {
  title: "ConnectMe · One inbox for every customer channel",
  description:
    "ConnectMe puts WhatsApp, Messenger, Instagram, Telegram and Discord into a single agent inbox, with reply-window countdowns and per-page routing.",
};

export default async function HomePage() {
  const { userId } = await auth();
  return <LandingModule userId={userId} />;
}
