"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function UserMenu() {
  const { user } = useUser();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Account";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={name}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-hairline bg-canvas-elevated cursor-pointer transition-transform duration-150 hover:scale-105"
      >
        {user?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-primary text-[11px] font-semibold text-on-primary">
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[100] mt-2 w-56 overflow-hidden rounded-[10px] border border-hairline bg-canvas-elevated shadow-[0px_20px_50px_rgba(0,0,0,0.18)]"
        >
          <div className="border-b border-hairline px-3.5 py-3">
            <p className="truncate text-[13px] font-medium text-ink">{name}</p>
            {user?.primaryEmailAddress?.emailAddress && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-mute">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
          </div>

          <div className="p-1.5 space-y-0.5">
            <Link
              href="/dashboard"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-8 items-center rounded-[6px] px-2.5 text-[13px] text-body transition-colors hover:bg-surface-well hover:text-ink"
            >
              Dashboard
            </Link>

            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-8 items-center rounded-[6px] px-2.5 text-[13px] text-body transition-colors hover:bg-surface-well hover:text-ink"
            >
              Settings
            </Link>

            <div className="my-1 h-px bg-hairline" />

            <Link
              href="/"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-8 items-center justify-between rounded-[6px] px-2.5 text-[13px] text-body transition-colors hover:bg-surface-well hover:text-ink"
            >
              <span>Public Website</span>
              <svg
                className="h-3.5 w-3.5 text-mute"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </Link>

            <div className="my-1 h-px bg-hairline" />

            <button
              type="button"
              role="menuitem"
              onClick={() => clerk.signOut({ redirectUrl: "/" })}
              className="flex h-8 w-full items-center rounded-[6px] px-2.5 text-left text-[13px] text-error transition-colors hover:bg-error/10 hover:text-error cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
