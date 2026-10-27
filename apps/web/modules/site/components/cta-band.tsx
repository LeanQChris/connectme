"use client";

import Link from "next/link";

interface CtaBandProps {
  userId?: string | null;
}

export function CtaBand({ userId }: CtaBandProps) {
  return (
    <section className="border-t border-hairline bg-canvas-elevated">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center md:py-24">
        <h2 className="text-balance text-[32px] font-semibold leading-[1.08] tracking-[-0.04em] text-ink sm:text-[42px]">
          Five channels. One place to answer.
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-body">
          Start with your existing pages and numbers. Add or remove channels as
          the team grows.
        </p>
        <Link
          href={userId ? "/inbox" : "/sign-in"}
          className="mt-8 flex h-11 items-center justify-center rounded-full bg-primary px-7 text-[14px] font-medium text-on-primary transition-opacity duration-150 hover:opacity-90 active:scale-[0.98]"
        >
          {userId ? "Open your inbox" : "Sign in with Google"}
        </Link>
      </div>
    </section>
  );
}
