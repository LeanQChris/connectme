"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { useState } from "react";

/**
 * Google is the only auth strategy, so this single button both signs in and signs
 * up: Clerk provisions the account on the first successful OAuth handshake.
 *
 * `redirectUrl` — where the browser lands once a session exists.
 * Clerk only routes here when something is still missing (see /sign-in/callback).
 */
export default function GoogleSignInButton({ redirectUrl }: { redirectUrl: string }) {
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setPending(true);
    setError(null);

    // On success this never resolves in a useful way — the browser is leaving.
    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl,
      redirectCallbackUrl: "/sign-in/callback",
    });

    if (error) {
      setPending(false);
      setError(error.message || "Google sign-in is unavailable right now.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={!isLoaded || pending}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[6px] border border-hairline bg-canvas-elevated text-[14px] font-medium text-ink shadow-xs transition-colors hover:bg-surface-well disabled:opacity-60"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.97 10.72a5.4 5.4 0 010-3.44V4.95H.96a9 9 0 000 8.1l3.01-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
          />
        </svg>
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>

      {error && <p className="mt-3 text-center text-[12px] text-error">{error}</p>}
    </div>
  );
}
