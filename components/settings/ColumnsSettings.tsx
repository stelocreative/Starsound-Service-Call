"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toaster";
import { createClient } from "@/lib/supabase/client";
import type { BoardColumn, Person } from "@/lib/types";
import { SettingsIntro } from "./SettingsView";

export function ColumnsSettings({ columns: initial, people }: { columns: BoardColumn[]; people: Person[] }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [columns, setColumns] = useState(initial);

  async function setOwner(column: BoardColumn, ownerId: string | null) {
    const previous = column.default_owner_id;
    setColumns((list) => list.map((c) => (c.id === column.id ? { ...c, default_owner_id: ownerId } : c)));
    const { error } = await supabase.from("board_columns").update({ default_owner_id: ownerId }).eq("id", column.id);
    if (error) {
      setColumns((list) => list.map((c) => (c.id === column.id ? { ...c, default_owner_id: previous } : c)));
      toast.error(`Couldn't update ${column.name}: ${error.message}`);
      return;
    }
    toast.success(`${column.name} now defaults to ${people.find((p) => p.id === ownerId)?.name ?? "no owner"}`);
  }

  const options = (selected: string | null) => people.filter((p) => p.active || p.id === selected);

  return (
    <div>
      <SettingsIntro>
        Moving a card into a column sets its owner to that column&apos;s default owner. Change a default here when
        someone is out; the next card moved into the column gets the new owner. Existing cards keep their owner.
      </SettingsIntro>
      <ol className="flex flex-col divide-y divide-line">
        {columns.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <span className="w-6 font-mono text-[11px] text-label">{c.position}</span>
            <div className="min-w-[160px] flex-1">
              <div className="font-heading text-[13px] font-bold uppercase tracking-[0.1em] text-ink-value">{c.name}</div>
              {c.description ? <div className="text-[12px] text-label">{c.description}</div> : null}
            </div>
            <label className="flex items-center gap-2 text-[12px] text-label">
              Default owner
              <select
                aria-label={`Default owner for ${c.name}`}
                value={c.default_owner_id ?? ""}
                onChange={(e) => void setOwner(c, e.target.value || null)}
                className="pill pill-select"
              >
                <option value="">None</option>
                {options(c.default_owner_id).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.active ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>
    </div>
  );
}
