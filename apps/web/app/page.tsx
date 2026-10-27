import { auth } from "@clerk/nextjs/server";
import { LandingModule } from "@/modules/site";

export const metadata = {
  title: "ConnectMe · One inbox for every customer channel",
  description:
    "WhatsApp, Messenger, Instagram, Telegram and Discord in one agent inbox, with a live countdown on every reply window and per-page routing for Meta.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const { userId } = await auth();
  return <LandingModule userId={userId} />;
}