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
        setError(data.error ?? "Login failed");
        return;
      }

      // Return to wherever the proxy bounced us from.
      const next = new URLSearchParams(window.location.search).get("next") ?? "/";
      router.replace(next);
      router.refresh();
    } catch {
      setError("Could not reach the server");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-xs">
        <h1 className="text-sm font-medium tracking-tight text-ink">Inbox</h1>
        <p className="mt-1 text-[13px] text-ink-secondary">
          WhatsApp and Messenger, in one place. Internal only.
        </p>

        <label htmlFor="password" className="mt-8 block text-xs text-ink-secondary">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1.5 w-full rounded-md border border-hairline-strong bg-bg px-2.5 py-2 text-[13px] text-ink outline-none transition-colors focus:border-ink-muted"
        />

        {error ? (
          <p role="alert" className="mt-2 text-[13px] text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !password}
          className="mt-4 w-full rounded-md bg-ink px-3 py-2 text-[13px] font-medium text-bg transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}