"use client";

import GoogleSignInButton from "./google-sign-in-button";

interface SignInCardProps {
  redirectUrl: string;
  error?: string;
}

export function SignInCard({ redirectUrl, error }: SignInCardProps) {
  return (
    <div className="rounded-2xl border border-hairline bg-canvas-elevated p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.04),0px_8px_24px_rgba(0,0,0,0.05)] dark:shadow-[0px_8px_32px_rgba(0,0,0,0.4)]">
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-[12.5px] leading-relaxed text-error flex items-start gap-2.5"
        >
          <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Sign-in failed ({error}). Please verify your credentials and try again.</span>
        </div>
      )}

      <GoogleSignInButton redirectUrl={redirectUrl} />

      <p className="mt-4 text-center text-[12px] text-mute">
        New accounts are created automatically on first sign-in.
      </p>

      {/* Security Guarantee Strip */}
      <div className="mt-5 border-t border-hairline pt-4 grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[12px]">🔒</span>
          <span className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-mute">
            AES-256 Vault
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[12px]">🛡️</span>
          <span className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-mute">
            OAuth 2.0
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[12px]">⚡</span>
          <span className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-mute">
            Zero Passwords
          </span>
        </div>
      </div>
    </div>
  );
}
