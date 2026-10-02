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
    <main className="flex justify-center items-center px-4 min-h-[100dvh]">
      <form onSubmit={onSubmit} className="w-full max-w-xs">
        <h1 className="font-medium text-ink text-sm tracking-tight">Inbox</h1>
        <p className="mt-1 text-[13px] text-ink-secondary">
          WhatsApp and Messenger, in one place. Internal only.
        </p>

        <label htmlFor="password" className="block mt-8 text-ink-secondary text-xs">
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
          className="bg-bg mt-1.5 px-2.5 py-2 border border-hairline-strong focus:border-ink-muted rounded-md outline-none w-full text-[13px] text-ink transition-colors"
        />

        {error ? (
          <p role="alert" className="mt-2 text-[13px] text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !password}
          className="bg-ink hover:opacity-80 disabled:opacity-30 mt-4 px-3 py-2 rounded-md w-full font-medium text-[13px] text-bg transition-opacity disabled:cursor-not-allowed"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}