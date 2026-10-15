"use client";

import type { AuthError } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { safeNextPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/client";

type Mode = "link" | "password";
type Status = "idle" | "working" | "sent";

const NOT_ALLOWED =
  "That email isn't on the Service Board allowlist. Ask a teammate to add it under Settings → Users.";

function friendlyOtpError(message: string): string {
  if (/rate limit|too many/i.test(message)) {
    return "Too many sign-in emails were sent recently. Wait a few minutes and try again.";
  }
  if (/database error|allowlist/i.test(message)) {
    return NOT_ALLOWED;
  }
  return message;
}

function friendlyPasswordError(error: AuthError): string {
  if (error.code === "invalid_credentials" || /invalid login credentials/i.test(error.message)) {
    return "That email and password don't match. If you haven't set a password yet, sign in with a link first, then set one from the account menu.";
  }
  if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
    return "This email hasn't been confirmed yet. Sign in with a link first.";
  }
  if (error.code === "over_request_rate_limit" || /rate limit|too many/i.test(error.message)) {
    return "Too many sign-in attempts. Wait a few minutes and try again.";
  }
  return error.message;
}

/**
 * Sign-in form with two methods: a magic link (default, also how accounts get created)
 * and an email + password for people who set one from the account menu.
 * Both run the allowlist pre-check first; the database enforces it again regardless.
 */
export function LoginForm() {
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [mode, setMode] = useState<Mode>("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(params.get("error"));

  const address = email.trim().toLowerCase();
  const busy = status === "working";

  function switchMode(to: Mode) {
    setMode(to);
    setPassword("");
    setError(null);
  }

  /** Allowlist pre-check shared by both methods. Returns false (and shows why) when the email can't sign in. */
  async function emailAllowed(supabase: ReturnType<typeof createClient>): Promise<boolean> {
    const { data: allowed, error: checkError } = await supabase.rpc("is_email_allowed", { p_email: address });
    if (checkError) {
      setError(checkError.message);
      setStatus("idle");
      return false;
    }
    if (!allowed) {
      setError(NOT_ALLOWED);
      setStatus("idle");
      return false;
    }
    return true;
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!address || busy) return;
    setError(null);
    setStatus("working");

    const supabase = createClient();
    if (!(await emailAllowed(supabase))) return;

    const callback = new URL("/auth/callback", window.location.origin);
    if (next !== "/") callback.searchParams.set("next", next);
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

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !password || busy) return;
    setError(null);
    setStatus("working");

    const supabase = createClient();
    if (!(await emailAllowed(supabase))) return;

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: address, password });
    if (signInError) {
      setError(friendlyPasswordError(signInError));
      setStatus("idle");
      return;
    }
    // Full navigation so the server sees the new session cookies before it renders the board.
    window.location.assign(next);
  }

  if (status === "sent") {
    return (
      <div className="mt-6">
        <h1 className="text-[18px] font-semibold text-ink-bright">Check your email</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
          We sent a sign-in link to <span className="text-ink-value">{address}</span>. Open it in this browser to get
          onto the board. The link works once and expires after an hour.
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

  const emailField = (
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
        disabled={busy}
        className="input"
      />
    </div>
  );

  const errorBox = error ? (
    <div role="alert" className="rounded-lg border border-[#5a2222] bg-danger-bg px-3 py-2.5 text-[13px] text-danger">
      {error}
    </div>
  ) : null;

  if (mode === "password") {
    return (
      <form onSubmit={signInWithPassword} className="mt-6 flex flex-col gap-4">
        <div>
          <h1 className="text-[18px] font-semibold text-ink-bright">Sign in with a password</h1>
          <p className="mt-1 text-[13px] text-ink-2">Use the password you set from the account menu.</p>
        </div>
        {emailField}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            className="input"
          />
        </div>
        {errorBox}
        <button type="submit" disabled={busy || !address || !password} className="btn btn-primary w-full py-2.5">
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => switchMode("link")}
          disabled={busy}
          className="self-center text-[13px] font-semibold text-link hover:text-link-hover"
        >
          Email me a sign-in link instead
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendLink} className="mt-6 flex flex-col gap-4">
      <div>
        <h1 className="text-[18px] font-semibold text-ink-bright">Sign in</h1>
        <p className="mt-1 text-[13px] text-ink-2">We&apos;ll email you a one-time sign-in link.</p>
      </div>
      {emailField}
      {errorBox}
      <button type="submit" disabled={busy || !address} className="btn btn-primary w-full py-2.5">
        {busy ? "Sending link…" : "Send sign-in link"}
      </button>
      <button
        type="button"
        onClick={() => switchMode("password")}
        disabled={busy}
        className="self-center text-[13px] font-semibold text-link hover:text-link-hover"
      >
        Sign in with a password instead
      </button>
    </form>
  );
}
