import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · Starsound Service Board" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] rounded-[14px] border border-line-card border-t-2 border-t-accent bg-surface p-6 shadow-[0_18px_48px_rgba(0,0,0,0.55)] sm:p-7">
        <div className="flex items-center gap-2.5">
          <div className="font-heading text-[18px] font-bold leading-none tracking-[0.06em] text-ink-bright">
            STARSOUND <span className="text-brand">OS</span>
          </div>
          <span className="rounded border border-tag-line px-1.5 py-0.5 font-mono text-[10px] leading-none tracking-[0.14em] text-tag">
            SERVICE BOARD
          </span>
        </div>
        <Suspense fallback={<div className="mt-6 text-[13px] text-label">Loading…</div>}>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-5 text-[11.5px] text-muted">Internal tool for Starsound Audio staff.</p>
    </main>
  );
}
