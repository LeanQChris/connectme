"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Stand-in for Clerk's UserButton popover: identity, settings, sign out. */
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

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Account";
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
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-hairline bg-canvas-elevated"
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
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-[10px] border border-hairline bg-canvas-elevated shadow-[0px_20px_50px_rgba(0,0,0,0.12)]"
        >
          <div className="border-b border-hairline px-3.5 py-3">
            <p className="truncate text-[13px] font-medium text-ink">{name}</p>
            {user?.primaryEmailAddress?.emailAddress && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-mute">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
          </div>

          <div className="p-1.5">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex h-8 items-center rounded-[6px] px-2.5 text-[13px] text-body transition-colors hover:bg-surface-well hover:text-ink"
            >
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => clerk.signOut({ redirectUrl: "/" })}
              className="flex h-8 w-full items-center rounded-[6px] px-2.5 text-left text-[13px] text-body transition-colors hover:bg-surface-well hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
