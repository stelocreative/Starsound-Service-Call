"use client";

import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toaster";
import { CATEGORY_COLORS, CATEGORY_PALETTE, categoryStyle } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";
import type { Category, CategoryColor } from "@/lib/types";
import { SettingsIntro } from "./SettingsView";

export function CategoriesSettings({ categories: initial }: { categories: Category[] }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const [categories, setCategories] = useState(initial);
  const [name, setName] = useState("");
  const [color, setColor] = useState<CategoryColor>("blue");
  const [saving, setSaving] = useState(false);

  const replace = (updated: Category) => setCategories((list) => list.map((c) => (c.id === updated.id ? updated : c)));

  async function update(category: Category, patch: Partial<Pick<Category, "name" | "color" | "active">>) {
    const { data, error } = await supabase.from("categories").update(patch).eq("id", category.id).select("*").single();
    if (error) {
      toast.error(`Couldn't update ${category.name}: ${error.message}`);
      return;
    }
    replace(data);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: n, color, sort_order: categories.length + 1 })
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      toast.error(`Couldn't add category: ${error.message}`);
      return;
    }
    setCategories((list) => [...list, data]);
    setName("");
    toast.success(`${data.name} added`);
  }

  return (
    <div>
      <SettingsIntro>
        Categories drive the card color: a left stripe and a small chip, never a full background. Deactivated
        categories disappear from the new-ticket form but stay on existing tickets.
      </SettingsIntro>
      <ul className="flex flex-col divide-y divide-line">
        {categories.map((c) => {
          const style = categoryStyle(c);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="h-7 w-1 rounded-full" style={{ background: style.stripe }} aria-hidden="true" />
              <input
                aria-label={`Name for ${c.name}`}
                defaultValue={c.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== c.name) void update(c, { name: v });
                  else e.target.value = c.name;
                }}
                className="input w-[180px]"
              />
              <select
                aria-label={`Color for ${c.name}`}
                value={c.color}
                onChange={(e) => void update(c, { color: e.target.value })}
                className="pill pill-select"
              >
                {CATEGORY_COLORS.map((k) => (
                  <option key={k} value={k}>
                    {CATEGORY_PALETTE[k].label}
                  </option>
                ))}
              </select>
              <Chip fg={style.chipFg} bg={style.chipBg}>
                {c.name}
              </Chip>
              <span className={c.active ? "text-[12px] text-ok" : "text-[12px] text-label"}>{c.active ? "Active" : "Inactive"}</span>
              <button type="button" onClick={() => void update(c, { active: !c.active })} className="btn btn-secondary btn-sm ml-auto">
                {c.active ? "Deactivate" : "Reactivate"}
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nc-name" className="field-label">
            New category
          </label>
          <input id="nc-name" className="input w-[220px]" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nc-color" className="field-label">
            Color
          </label>
          <select id="nc-color" className="input select-chevron w-[140px]" value={color} onChange={(e) => setColor(e.target.value as CategoryColor)}>
            {CATEGORY_COLORS.map((k) => (
              <option key={k} value={k}>
                {CATEGORY_PALETTE[k].label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={!name.trim() || saving} className="btn btn-primary">
          {saving ? "Adding…" : "Add category"}
        </button>
      </form>
    </div>
  );
}
