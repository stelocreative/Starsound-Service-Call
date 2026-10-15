"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "./CurrentUserProvider";
import { SetPasswordModal } from "./SetPasswordModal";
import { Avatar } from "./ui/Avatar";
import { clsx } from "@/lib/clsx";

const NAV = [
  { href: "/", label: "Board" },
  { href: "/archive", label: "Archive" },
  { href: "/settings", label: "Settings" },
];

/** Dark header bar: brand block, section nav, page controls (children), user menu. */
export function TopBar({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <header className="z-30 flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-header-line border-t-2 border-t-accent bg-header px-4 py-2.5 md:px-5">
      <div className="flex items-center gap-2.5">
        <Link
          href="/"
          className="font-heading text-[18px] font-bold leading-none tracking-[0.06em] text-ink-bright hover:text-ink-bright"
        >
          STARSOUND <span className="text-brand">OS</span>
        </Link>
        <span className="hidden rounded border border-tag-line px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-[0.14em] text-tag sm:inline">
          SERVICE BOARD
        </span>
      </div>

      <nav aria-label="Sections" className="flex items-center gap-0.5 text-[12.5px] font-medium">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "rounded-md px-2 py-1 transition-colors",
                active ? "bg-card text-ink-bright hover:text-ink-bright" : "text-label hover:bg-card hover:text-ink-3",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}

      <UserMenu />
    </header>
  );
}

function UserMenu() {
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const closePassword = useCallback(() => setPasswordOpen(false), []);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto">
      <SetPasswordModal open={passwordOpen} onClose={closePassword} />
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.displayName}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-full"
      >
        <Avatar kind="user" initials={user.initials} size={30} />
      </button>
      {open ? (
        <div
          role="menu"
          className="anim-pop-in absolute right-0 top-[38px] z-40 w-[230px] rounded-[10px] border border-line-card bg-surface p-1.5 shadow-[0_14px_36px_rgba(0,0,0,0.5)]"
        >
          <div className="px-2.5 py-2">
            <div className="text-[13px] font-semibold text-ink-value">{user.displayName}</div>
            <div className="truncate text-[12px] text-label">{user.email}</div>
          </div>
          <div className="my-1 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setPasswordOpen(true);
            }}
            className="w-full rounded-md px-2.5 py-2 text-left text-[13px] text-ink-3 hover:bg-card hover:text-ink"
          >
            Set a password
          </button>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-md px-2.5 py-2 text-left text-[13px] text-ink-3 hover:bg-card hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
