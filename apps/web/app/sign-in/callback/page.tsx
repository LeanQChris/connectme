"use client";

import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Landing pad for the Google handshake. Clerk only sends the browser here when the
 * trip needed more than the OAuth hop — a brand-new account has to be created
 * (`isTransferable`) or an extra factor is pending, which this app does not handle.
 */
export default function SignInCallbackPage() {
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (!isLoaded || !signIn || ran.current) return;
    ran.current = true;

    const go = (url: string) => {
      if (url.startsWith("http")) window.location.href = url;
      else router.replace(url);
    };
    const backToSignIn = (code: string) =>
      router.replace(`/sign-in?error=${encodeURIComponent(code)}`);

    (async () => {
      if (signIn.status === "complete") {
        await signIn.finalize({ navigate: ({ decorateUrl }) => go(decorateUrl("/inbox")) });
        return;
      }

      if (signIn.isTransferable) {
        await signUp.create({ transfer: true });
        if (signUp.status === "complete") {
          await signUp.finalize({ navigate: ({ decorateUrl }) => go(decorateUrl("/inbox")) });
          return;
        }
      }

      backToSignIn(`oauth_${signIn.status}`);
    })().catch(() => backToSignIn("sign_in_incomplete"));
  }, [isLoaded, router, signIn, signUp]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas">
      <p className="font-mono text-[11px] uppercase tracking-wider text-mute">
        Finishing Google sign-in…
      </p>
    </div>
  );
}
