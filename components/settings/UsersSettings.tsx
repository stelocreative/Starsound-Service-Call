"use client";

import { useMemo, useState } from "react";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { useToast } from "@/components/ui/Toaster";
import { createClient } from "@/lib/supabase/client";
import type { AllowedUser, Person } from "@/lib/types";
import { SettingsIntro } from "./SettingsView";

export function UsersSettings({ users: initial, people }: { users: AllowedUser[]; people: Person[] }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const me = useCurrentUser();
  const [users, setUsers] = useState(initial);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [personId, setPersonId] = useState("");
  const [saving, setSaving] = useState(false);

  const isPlaceholder = (u: AllowedUser) => u.email.startsWith("[");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("allowed_users")
      .insert({ email: address, display_name: displayName.trim() || null, person_id: personId || null })
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "That email is already on the list." : `Couldn't add user: ${error.message}`);
      return;
    }
    setUsers((list) => [...list, data]);
    setEmail("");
    setDisplayName("");
    setPersonId("");
    toast.success(`${data.email} can now sign in`);
  }

  async function update(user: AllowedUser, patch: Partial<Pick<AllowedUser, "display_name" | "person_id">>) {
    const { data, error } = await supabase.from("allowed_users").update(patch).eq("email", user.email).select("*").single();
    if (error) {
      toast.error(`Couldn't update ${user.email}: ${error.message}`);
      return;
    }
    setUsers((list) => list.map((u) => (u.email === user.email ? data : u)));
  }

  async function remove(user: AllowedUser) {
    if (users.length <= 1) {
      toast.error("Keep at least one user on the list or nobody can sign in.");
      return;
    }
    const mine = user.email === me.email.toLowerCase();
    const message = mine
      ? `Remove your own email (${user.email})? You will lose access the moment you sign out.`
      : `Remove ${user.email} from the allowlist? They will lose access immediately.`;
    if (!window.confirm(message)) return;
    const { error } = await supabase.from("allowed_users").delete().eq("email", user.email);
    if (error) {
      toast.error(`Couldn't remove ${user.email}: ${error.message}`);
      return;
    }
    setUsers((list) => list.filter((u) => u.email !== user.email));
    toast.success(`${user.email} removed`);
  }

  return (
    <div>
      <SettingsIntro>
        Users are logins. Anyone on this list can request a magic link and gets full access; everyone else is
        refused at sign-in and by the database. Link a login to a person so notes and moves show that person&apos;s
        name. Placeholder rows in brackets must be replaced with real addresses.
      </SettingsIntro>

      <ul className="flex flex-col divide-y divide-line">
        {users.map((u) => (
          <li key={u.email} className="flex flex-wrap items-center gap-3 py-2.5">
            <span className={`min-w-[200px] flex-1 truncate font-mono text-[12.5px] ${isPlaceholder(u) ? "text-stale-fg" : "text-ink-value"}`} title={u.email}>
              {u.email}
              {isPlaceholder(u) ? " — replace me" : ""}
              {u.email === me.email.toLowerCase() ? " (you)" : ""}
            </span>
            <input
              aria-label={`Display name for ${u.email}`}
              defaultValue={u.display_name ?? ""}
              placeholder="Display name"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (u.display_name ?? "")) void update(u, { display_name: v || null });
              }}
              className="input w-[160px]"
            />
            <select
              aria-label={`Linked person for ${u.email}`}
              value={u.person_id ?? ""}
              onChange={(e) => void update(u, { person_id: e.target.value || null })}
              className="pill pill-select"
            >
              <option value="">No linked person</option>
              {people
                .filter((p) => p.active || p.id === u.person_id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <button type="button" onClick={() => void remove(u)} className="btn btn-danger btn-sm ml-auto">
              Remove
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nu-email" className="field-label">
            New user email
          </label>
          <input id="nu-email" type="email" className="input w-[240px]" placeholder="name@starsoundaudio.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nu-name" className="field-label">
            Display name
          </label>
          <input id="nu-name" className="input w-[160px]" placeholder="Optional" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nu-person" className="field-label">
            Linked person
          </label>
          <select id="nu-person" className="input select-chevron w-[170px]" value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">None</option>
            {people
              .filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
        <button type="submit" disabled={!email.trim() || saving} className="btn btn-primary">
          {saving ? "Adding…" : "Add user"}
        </button>
      </form>
    </div>
  );
}
