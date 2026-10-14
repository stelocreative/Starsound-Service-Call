"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toaster";
import { createClient } from "@/lib/supabase/client";
import { NEW_KEY, PAID_KEY, type BoardColumn, type Person } from "@/lib/types";
import { SettingsIntro } from "./SettingsView";

/** Columns the app relies on: the first column takes new tickets, Paid is where cards archive from. */
const BUILT_IN: Record<string, string> = {
  [NEW_KEY]: "new tickets land here",
  [PAID_KEY]: "cards archive from here",
};

type ColumnPatch = Partial<Pick<BoardColumn, "name" | "description" | "default_owner_id">>;

export function ColumnsSettings({ columns: initial, people }: { columns: BoardColumn[]; people: Person[] }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [columns, setColumns] = useState(initial);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [saving, setSaving] = useState(false);

  // Ticket counts per column, so a delete can say what is in the way.
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("tickets")
      .select("column_id")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const next: Record<string, number> = {};
        for (const row of data) next[row.column_id] = (next[row.column_id] ?? 0) + 1;
        setCounts(next);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const replace = (updated: BoardColumn) => setColumns((list) => list.map((c) => (c.id === updated.id ? updated : c)));
  const owners = (selected: string | null) => people.filter((p) => p.active || p.id === selected);

  async function reload() {
    const { data, error } = await supabase.from("board_columns").select("*").order("position", { ascending: true });
    if (!error && data) setColumns(data);
  }

  async function update(column: BoardColumn, patch: ColumnPatch) {
    replace({ ...column, ...patch });
    const { data, error } = await supabase.from("board_columns").update(patch).eq("id", column.id).select("*").single();
    if (error) {
      replace(column);
      toast.error(`Couldn't update ${column.name}: ${error.message}`);
      return;
    }
    replace(data);
    if ("default_owner_id" in patch) {
      toast.success(`${data.name} now defaults to ${people.find((p) => p.id === data.default_owner_id)?.name ?? "no owner"}`);
    }
  }

  async function move(column: BoardColumn, direction: -1 | 1) {
    const index = columns.findIndex((c) => c.id === column.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= columns.length) return;
    const previous = columns;
    const next = [...columns];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((c, i) => ({ ...c, position: i + 1 }));
    setColumns(renumbered);
    const { error } = await supabase.rpc("reorder_columns", { p_ids: renumbered.map((c) => c.id) });
    if (error) {
      setColumns(previous);
      toast.error(`Couldn't reorder columns: ${error.message}`);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("add_column", {
      p_name: n,
      p_description: description.trim() || null,
      p_default_owner_id: ownerId || null,
    });
    setSaving(false);
    if (error) {
      toast.error(`Couldn't add column: ${error.message}`);
      return;
    }
    await reload();
    setName("");
    setDescription("");
    setOwnerId("");
    toast.success(`${data.name} added`);
  }

  async function remove(column: BoardColumn) {
    const inColumn = counts[column.id] ?? 0;
    if (inColumn > 0) {
      toast.error(`Move the ${inColumn} ticket${inColumn === 1 ? "" : "s"} out of ${column.name} before deleting it.`);
      return;
    }
    if (!window.confirm(`Delete the ${column.name} column? Ticket history keeps its name.`)) return;
    const { error } = await supabase.from("board_columns").delete().eq("id", column.id);
    if (error) {
      toast.error(`Couldn't delete ${column.name}: ${error.message}`);
      return;
    }
    setColumns((list) => list.filter((c) => c.id !== column.id));
    toast.success(`${column.name} deleted`);
  }

  return (
    <div>
      <SettingsIntro>
        Columns are the stages a service call moves through. Rename, describe, reorder, add or delete them here. Moving a
        card into a column sets its owner to that column&apos;s default owner; existing cards keep their owner when a
        default changes. New tickets land in the first column, and Paid is where cards archive from, so those two stay.
      </SettingsIntro>

      <ol className="flex flex-col divide-y divide-line">
        {columns.map((c, i) => {
          const builtIn = BUILT_IN[c.key];
          const inColumn = counts[c.id] ?? 0;
          return (
            <li key={c.id} className="flex flex-col gap-2 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-6 font-mono text-[11px] text-label">{c.position}</span>
                <input
                  aria-label={`Name for ${c.name}`}
                  defaultValue={c.name}
                  maxLength={40}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== c.name) void update(c, { name: v });
                    else e.target.value = c.name;
                  }}
                  className="input w-[200px] font-heading text-[13px] font-bold uppercase tracking-[0.08em]"
                />
                <input
                  aria-label={`Description for ${c.name}`}
                  defaultValue={c.description ?? ""}
                  placeholder="Description"
                  maxLength={120}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (c.description ?? "")) void update(c, { description: v || null });
                  }}
                  className="input min-w-[200px] flex-1"
                />
                <label className="flex items-center gap-2 text-[12px] text-label">
                  Default owner
                  <select
                    aria-label={`Default owner for ${c.name}`}
                    value={c.default_owner_id ?? ""}
                    onChange={(e) => void update(c, { default_owner_id: e.target.value || null })}
                    className="pill pill-select"
                  >
                    <option value="">None</option>
                    {owners(c.default_owner_id).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.active ? "" : " (inactive)"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-9 text-[12px] text-label">
                <span>
                  {inColumn} ticket{inColumn === 1 ? "" : "s"}
                </span>
                {builtIn ? <span className="mono-badge bg-chip text-badge-fg">built in: {builtIn}</span> : null}
                <div className="ml-auto flex gap-1.5">
                  <button
                    type="button"
                    aria-label={`Move ${c.name} up`}
                    title="Move up"
                    disabled={i === 0}
                    onClick={() => void move(c, -1)}
                    className="btn btn-secondary btn-sm disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${c.name} down`}
                    title="Move down"
                    disabled={i === columns.length - 1}
                    onClick={() => void move(c, 1)}
                    className="btn btn-secondary btn-sm disabled:opacity-40"
                  >
                    ↓
                  </button>
                  {builtIn ? null : (
                    <button type="button" onClick={() => void remove(c)} className="btn btn-danger btn-sm">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ncol-name" className="field-label">
            New column
          </label>
          <input
            id="ncol-name"
            className="input w-[200px]"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ncol-desc" className="field-label">
            Description
          </label>
          <input
            id="ncol-desc"
            className="input w-[260px]"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ncol-owner" className="field-label">
            Default owner
          </label>
          <select id="ncol-owner" className="input select-chevron w-[170px]" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
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
        <button type="submit" disabled={!name.trim() || saving} className="btn btn-primary">
          {saving ? "Adding…" : "Add column"}
        </button>
        <p className="w-full text-[11.5px] text-muted">New columns go in just ahead of Paid; use the arrows to move them.</p>
      </form>
    </div>
  );
}
