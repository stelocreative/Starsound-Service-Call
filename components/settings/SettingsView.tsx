"use client";

import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { clsx } from "@/lib/clsx";
import type { AllowedUser, ReferenceData } from "@/lib/types";
import { CategoriesSettings } from "./CategoriesSettings";
import { ColumnsSettings } from "./ColumnsSettings";
import { PeopleSettings } from "./PeopleSettings";
import { UsersSettings } from "./UsersSettings";

const TABS = [
  { key: "people", label: "People" },
  { key: "columns", label: "Column owners" },
  { key: "categories", label: "Categories" },
  { key: "users", label: "Users" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function SettingsView({ reference, allowedUsers }: { reference: ReferenceData; allowedUsers: AllowedUser[] }) {
  const [tab, setTab] = useState<TabKey>("people");
  const [people, setPeople] = useState(reference.people);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-5 md:px-5">
        <h1 className="font-heading text-[15px] font-bold uppercase tracking-[0.1em] text-ink-value">Settings</h1>
        <div role="tablist" aria-label="Settings sections" className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={clsx("pill shrink-0", tab === t.key && "pill-accent")}
              style={{ padding: "7px 14px", backgroundImage: "none" }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <section className="mt-4 rounded-panel border border-line bg-surface p-4 sm:p-5">
          {tab === "people" ? <PeopleSettings people={people} onChange={setPeople} /> : null}
          {tab === "columns" ? <ColumnsSettings columns={reference.columns} people={people} /> : null}
          {tab === "categories" ? <CategoriesSettings categories={reference.categories} /> : null}
          {tab === "users" ? <UsersSettings users={allowedUsers} people={people} /> : null}
        </section>
      </main>
    </div>
  );
}

export function SettingsIntro({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-[13px] leading-relaxed text-ink-2">{children}</p>;
}
