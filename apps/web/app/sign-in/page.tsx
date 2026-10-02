import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignInModule } from "@/modules/auth";

export const metadata = {
  title: "Sign in · ConnectMe",
  description: "Sign in to ConnectMe to access your unified omnichannel customer inbox.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect_url?: string }>;
}) {
  const { error, redirect_url: requested } = await searchParams;

  // Same-origin paths only
  const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/inbox";

  const { userId } = await auth();
  if (userId) {
    redirect(next);
  }

  return <SignInModule redirectUrl={next} error={error} />;
}
