"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toaster";
import { initialsFor } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "@/lib/types";
import { SettingsIntro } from "./SettingsView";

export function PeopleSettings({ people, onChange }: { people: Person[]; onChange: (people: Person[]) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [initialsTouched, setInitialsTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const replace = (updated: Person) => onChange(people.map((p) => (p.id === updated.id ? updated : p)));

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const i = (initials.trim() || initialsFor(n)).toUpperCase().slice(0, 3);
    if (!n) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("people")
      .insert({ name: n, initials: i, sort_order: people.length + 1 })
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      toast.error(`Couldn't add person: ${error.message}`);
      return;
    }
    onChange([...people, data]);
    setName("");
    setInitials("");
    setInitialsTouched(false);
    toast.success(`${data.name} added`);
  }

  async function update(person: Person, patch: Partial<Pick<Person, "name" | "initials" | "active">>) {
    const { data, error } = await supabase.from("people").update(patch).eq("id", person.id).select("*").single();
    if (error) {
      toast.error(`Couldn't update ${person.name}: ${error.message}`);
      return;
    }
    replace(data);
  }

  return (
    <div>
      <SettingsIntro>
        People can be assigned work or own a stage. Deactivate someone who leaves: they drop out of the assign and owner
        menus, while tickets and history that mention them stay intact.
      </SettingsIntro>

      <ul className="flex flex-col divide-y divide-line">
        {people.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <Avatar kind="tech" initials={p.initials} size={28} />
            <input
              aria-label={`Name for ${p.name}`}
              defaultValue={p.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== p.name) void update(p, { name: v });
                else e.target.value = p.name;
              }}
              className="input w-[200px] flex-1 sm:flex-none"
            />
            <input
              aria-label={`Initials for ${p.name}`}
              defaultValue={p.initials}
              maxLength={3}
              onBlur={(e) => {
                const v = e.target.value.trim().toUpperCase().slice(0, 3);
                if (v && v !== p.initials) void update(p, { initials: v });
                else e.target.value = p.initials;
              }}
              className="input w-[72px] font-mono uppercase"
            />
            <span className={p.active ? "text-[12px] text-ok" : "text-[12px] text-label"}>{p.active ? "Active" : "Inactive"}</span>
            <button type="button" onClick={() => void update(p, { active: !p.active })} className="btn btn-secondary btn-sm ml-auto">
              {p.active ? "Deactivate" : "Reactivate"}
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={addPerson} className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="np-name" className="field-label">
            New person
          </label>
          <input
            id="np-name"
            className="input w-[220px]"
            placeholder="Full name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!initialsTouched) setInitials(e.target.value.trim() ? initialsFor(e.target.value) : "");
            }}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="np-initials" className="field-label">
            Initials
          </label>
          <input
            id="np-initials"
            className="input w-[80px] font-mono uppercase"
            maxLength={3}
            value={initials}
            onChange={(e) => {
              setInitials(e.target.value.toUpperCase());
              setInitialsTouched(true);
            }}
          />
        </div>
        <button type="submit" disabled={!name.trim() || saving} className="btn btn-primary">
          {saving ? "Adding…" : "Add person"}
        </button>
      </form>
    </div>
  );
}
