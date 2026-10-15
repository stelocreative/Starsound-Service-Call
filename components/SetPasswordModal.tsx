"use client";

import type { AuthError } from "@supabase/supabase-js";
import { useCallback, useState } from "react";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toaster";
import { createClient } from "@/lib/supabase/client";

export const MIN_PASSWORD_LENGTH = 8;

const REAUTH_MESSAGE =
  "For security, setting a password needs a recent sign-in. Sign out, sign in again with an emailed link, then try again.";

function friendlyUpdateError(error: AuthError): string {
  if (error.code === "reauthentication_needed" || /reauthenticat/i.test(error.message)) {
    return REAUTH_MESSAGE;
  }
  if (error.code === "same_password") {
    return "That is already your password. Choose a different one.";
  }
  if (error.code === "over_request_rate_limit" || /rate limit|too many/i.test(error.message)) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  // weak_password and anything else: Supabase's own message says what to fix.
  return error.message;
}

/**
 * Lets a signed-in user add (or replace) a password on their existing account so they can
 * sign in without an emailed link. Accounts are only ever created by the first magic link,
 * so this never creates users and the allowlist stays in charge.
 */
export function SetPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useCurrentUser();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = password.length >= MIN_PASSWORD_LENGTH && confirm === password && !saving;

  const close = useCallback(() => {
    setPassword("");
    setConfirm("");
    setError(null);
    onClose();
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(friendlyUpdateError(updateError));
      return;
    }
    toast.success("Password set. Next time, you can sign in with your email and password.");
    close();
  }

  return (
    <Modal open={open} onClose={close} title="Set a password" labelledBy="set-password-title" width={400}>
      <p className="text-[13px] leading-relaxed text-ink-2">
        Add a password to <span className="text-ink-value">{user.email}</span> so you can sign in without waiting
        for an email. Emailed sign-in links keep working, and you can come back here to change the password.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sp-password" className="field-label">
            New password
          </label>
          <input
            id="sp-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={saving}
            aria-invalid={tooShort || undefined}
            aria-describedby="sp-password-hint"
            className="input"
          />
          <p id="sp-password-hint" className={`text-[12px] ${tooShort ? "text-danger" : "text-label"}`}>
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sp-confirm" className="field-label">
            Confirm new password
          </label>
          <input
            id="sp-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={saving}
            aria-invalid={mismatch || undefined}
            aria-describedby={mismatch ? "sp-confirm-error" : undefined}
            className="input"
          />
          {mismatch ? (
            <p id="sp-confirm-error" className="text-[12px] text-danger">
              Passwords don&apos;t match.
            </p>
          ) : null}
        </div>
        {error ? (
          <div role="alert" className="rounded-lg border border-[#5a2222] bg-danger-bg px-3 py-2.5 text-[13px] text-danger">
            {error}
          </div>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={close} disabled={saving} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} className="btn btn-primary">
            {saving ? "Saving…" : "Save password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
