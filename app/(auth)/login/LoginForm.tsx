"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent";

function friendlyOtpError(message: string): string {
  if (/rate limit|too many/i.test(message)) {
    return "Too many sign-in emails were sent recently. Wait a few minutes and try again.";
  }
  if (/database error|allowlist/i.test(message)) {
    return "That email isn't on the Service Board allowlist. Ask a teammate to add it under Settings → Users.";
  }
  return message;
}

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(params.get("error"));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address) return;
    setError(null);
    setStatus("sending");

    const supabase = createClient();
    const { data: allowed, error: checkError } = await supabase.rpc("is_email_allowed", { p_email: address });
    if (checkError) {
      setError(checkError.message);
      setStatus("idle");
      return;
    }
    if (!allowed) {
      setError("That email isn't on the Service Board allowlist. Ask a teammate to add it under Settings → Users.");
      setStatus("idle");
      return;
    }

    const callback = new URL("/auth/callback", window.location.origin);
    if (next && next !== "/") callback.searchParams.set("next", next);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
    });
    if (otpError) {
      setError(friendlyOtpError(otpError.message));
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="mt-6">
        <h1 className="text-[18px] font-semibold text-ink-bright">Check your email</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
          We sent a sign-in link to <span className="text-ink-value">{email.trim().toLowerCase()}</span>. Open it in
          this browser to get onto the board. The link works once and expires after an hour.
        </p>
        <button
          type="button"
          className="mt-5 text-[13px] font-semibold text-link hover:text-link-hover"
          onClick={() => {
            setStatus("idle");
            setError(null);
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <h1 className="text-[18px] font-semibold text-ink-bright">Sign in</h1>
        <p className="mt-1 text-[13px] text-ink-2">We&apos;ll email you a one-time sign-in link.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="you@starsoundaudio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "sending"}
          className="input"
        />
      </div>
      {error ? (
        <div role="alert" className="rounded-lg border border-[#5a2222] bg-danger-bg px-3 py-2.5 text-[13px] text-danger">
          {error}
        </div>
      ) : null}
      <button type="submit" disabled={status === "sending" || !email.trim()} className="btn btn-primary w-full py-2.5">
        {status === "sending" ? "Sending link…" : "Send sign-in link"}
      </button>
    </form>
  );
}
