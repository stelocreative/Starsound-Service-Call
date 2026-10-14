"use client";

import type { Category, Person } from "@/lib/types";

export type Filters = { category: string; tech: string; owner: string; q: string };
export const EMPTY_FILTERS: Filters = { category: "all", tech: "all", owner: "all", q: "" };

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
  categories: Category[];
  people: Person[];
};

export function FilterSelects({ filters, onChange, categories, people }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  return (
    <>
      <select
        aria-label="Filter by category"
        value={filters.category}
        onChange={(e) => set({ category: e.target.value })}
        className="pill pill-select"
      >
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by tech"
        value={filters.tech}
        onChange={(e) => set({ tech: e.target.value })}
        className="pill pill-select"
      >
        <option value="all">All techs</option>
        <option value="none">Unassigned</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.active ? "" : " (inactive)"}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter by owner"
        value={filters.owner}
        onChange={(e) => set({ owner: e.target.value })}
        className="pill pill-select"
      >
        <option value="all">All owners</option>
        <option value="none">No owner</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.active ? "" : " (inactive)"}
          </option>
        ))}
      </select>
    </>
  );
}

export function SearchInput({
  value,
  onChange,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      type="search"
      aria-label="Search tickets"
      placeholder="Search client or ticket #"
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? "input"}
      style={{ padding: "7px 12px", fontSize: 13 }}
    />
  );
}

export function hasActiveFilters(f: Filters) {
  return f.category !== "all" || f.tech !== "all" || f.owner !== "all" || f.q.trim() !== "";
}
