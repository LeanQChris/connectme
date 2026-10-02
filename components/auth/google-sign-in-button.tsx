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
    if (!signIn) return;
    setPending(true);
    setError(null);

    try {
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
    } catch (err: unknown) {
      setPending(false);
      const msg = err instanceof Error ? err.message : "Google sign-in is unavailable right now.";
      setError(msg);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={!isLoaded || pending}
        aria-label="Continue with Google"
        className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-hairline bg-canvas-elevated px-4 text-[14px] font-medium text-ink shadow-xs transition-all duration-200 hover:border-hairline-strong hover:bg-surface-well hover:shadow-sm active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 cursor-pointer"
      >
        {pending ? (
          <div className="flex items-center gap-2.5">
            <svg
              className="h-4 w-4 animate-spin text-ink"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-[13px] font-medium">Connecting to Google…</span>
          </div>
        ) : (
          <>
            <svg className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105" viewBox="0 0 18 18" aria-hidden="true">
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
            <span className="font-medium tracking-tight">Continue with Google</span>
            <span className="ml-auto flex items-center font-mono text-[11px] text-mute group-hover:text-ink transition-colors">
              SSO →
            </span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-error flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-error" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
