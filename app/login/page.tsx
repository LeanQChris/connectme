"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Invalid access credentials");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next") ?? "/inbox";
      router.replace(next);
      router.refresh();
    } catch {
      setError("Unable to connect to auth server");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-canvas px-4 selection:bg-ink selection:text-on-primary">
      {/* Hero Mesh Gradient Backdrop (per DESIGN.md) */}
      <div className="mesh-gradient pointer-events-none absolute inset-0 opacity-60 dark:opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--canvas)_40%,_transparent_100%)]" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-xl border border-hairline bg-canvas-elevated p-8 shadow-[0px_1px_1px_rgba(0,0,0,0.04),0px_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[0px_1px_1px_rgba(255,255,255,0.04),0px_8px_24px_rgba(0,0,0,0.4)]">
          {/* Brand Mark & Eyebrow */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[8px] border border-hairline bg-ink text-on-primary shadow-xs">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L2 19.7778H22L12 2Z" />
              </svg>
            </div>

            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-mute">
              CONNECTME // GATEWAY
            </span>

            <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.03em] text-ink">
              Sign in to Workspace
            </h1>

            <p className="mt-1 text-[13px] text-body">
              Unified Meta Messenger & WhatsApp Console
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-[12px] font-medium text-body"
              >
                Access Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••••"
                className="mt-1.5 h-10 w-full rounded-[6px] border border-hairline bg-canvas px-3 text-[13px] text-ink placeholder:text-mute focus:border-link focus:bg-canvas-elevated focus:outline-none transition-colors"
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-[6px] border border-error/20 bg-error/10 p-2.5 text-[12px] text-error font-medium flex items-center gap-2"
              >
                <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending || !password}
              className="flex h-10 w-full items-center justify-center rounded-[6px] bg-primary text-[13px] font-medium text-on-primary shadow-xs transition-opacity hover:opacity-90 active:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
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
                  <span>Authenticating…</span>
                </div>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="mt-6 border-t border-hairline pt-4 text-center">
            <span className="font-mono text-[10.5px] text-mute">
              Protected by Session Token & KV Store
            </span>
          </div>
        </div>

        {/* Brand footer */}
        <div className="mt-6 flex items-center justify-center gap-4 font-mono text-[11px] text-mute">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-messenger" /> Messenger API
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-whatsapp" /> WhatsApp Cloud
          </span>
        </div>
      </div>
    </main>
  );
}