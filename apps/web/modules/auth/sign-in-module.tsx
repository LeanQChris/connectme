"use client";

import SiteHeader from "@/components/layout/site-header";
import { SignInCard } from "./components/sign-in-card";
import { SignInPreview } from "./components/sign-in-preview";

export interface SignInModuleProps {
  redirectUrl: string;
  error?: string;
}

export default function SignInModule({ redirectUrl, error }: SignInModuleProps) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-canvas text-ink overflow-x-hidden selection:bg-neutral-900 selection:text-white dark:selection:bg-neutral-100 dark:selection:text-black">
      {/* Background ambient lighting */}
      <div className="mesh-gradient pointer-events-none absolute inset-0 opacity-60 dark:opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#0000000a_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* Top Header */}
      <SiteHeader variant="auth" />

      {/* Main Split Layout */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 lg:py-12">
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <SignInCard redirectUrl={redirectUrl} error={error} />
            <SignInPreview />
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-hairline py-4 px-6 text-center text-[12px] text-mute">
        <p>
          © {new Date().getFullYear()} ConnectMe. All customer messages stay private, encrypted, and isolated to your workspace.
        </p>
      </footer>
    </div>
  );
}
