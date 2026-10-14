"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { todayDateOnly } from "@/lib/format";
import type { BoardColumn, Category, Person, Ticket, TicketInsert } from "@/lib/types";

type Props = {
  onClose: () => void;
  categories: Category[];
  people: Person[];
  newColumn: BoardColumn | undefined;
  defaultOwner: Person | undefined;
  onCreate: (input: TicketInsert) => Promise<Ticket | null>;
};

const emptyForm = (categoryId: string) => ({
  title: "",
  client: "",
  categoryId,
  description: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  siteAddress: "",
  assignedToId: "",
  dateReceived: todayDateOnly(),
});

export function NewTicketModal({ onClose, categories, people, newColumn, defaultOwner, onCreate }: Props) {
  const activeCategories = useMemo(() => categories.filter((c) => c.active), [categories]);
  const activePeople = useMemo(() => people.filter((p) => p.active), [people]);
  const firstCategory = activeCategories[0]?.id ?? "";
  const [form, setForm] = useState(() => emptyForm(firstCategory));
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const canSubmit = form.title.trim().length > 0 && form.client.trim().length > 0 && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const created = await onCreate({
      title: form.title.trim(),
      client: form.client.trim(),
      category_id: form.categoryId || null,
      description: form.description.trim() || null,
      contact_name: form.contactName.trim() || null,
      contact_phone: form.contactPhone.trim() || null,
      contact_email: form.contactEmail.trim() || null,
      site_address: form.siteAddress.trim() || null,
      assigned_to_id: form.assignedToId || null,
      date_received: form.dateReceived || todayDateOnly(),
    });
    setSaving(false);
    if (!created) {
      setError("The ticket could not be created. Try again.");
      return;
    }
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="New service call" labelledBy="new-ticket-title">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Title" htmlFor="nf-title">
          <input
            id="nf-title"
            className="input"
            placeholder="What is the problem?"
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            required
            maxLength={200}
          />
        </Field>
        <Field label="Client" htmlFor="nf-client">
          <input
            id="nf-client"
            className="input"
            placeholder="Company or person"
            value={form.client}
            onChange={(e) => update({ client: e.target.value })}
            required
            maxLength={200}
          />
        </Field>
        <Field label="Category" htmlFor="nf-cat">
          <select
            id="nf-cat"
            className="input select-chevron"
            value={form.categoryId}
            onChange={(e) => update({ categoryId: e.target.value })}
          >
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="self-start text-[12.5px] font-semibold text-link hover:text-link-hover"
          aria-expanded={more}
        >
          {more ? "Hide details" : "More details (contact, site, description)"}
        </button>

        {more ? (
          <div className="flex flex-col gap-3.5 border-t border-line pt-3.5">
            <Field label="Description" htmlFor="nf-desc">
              <textarea
                id="nf-desc"
                className="input min-h-[72px] resize-y"
                placeholder="The request as it was taken"
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Contact name" htmlFor="nf-cname">
                <input id="nf-cname" className="input" value={form.contactName} onChange={(e) => update({ contactName: e.target.value })} />
              </Field>
              <Field label="Contact phone" htmlFor="nf-cphone">
                <input id="nf-cphone" type="tel" className="input" value={form.contactPhone} onChange={(e) => update({ contactPhone: e.target.value })} />
              </Field>
            </div>
            <Field label="Contact email" htmlFor="nf-cemail">
              <input id="nf-cemail" type="email" className="input" value={form.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} />
            </Field>
            <Field label="Site address" htmlFor="nf-site">
              <input id="nf-site" className="input" value={form.siteAddress} onChange={(e) => update({ siteAddress: e.target.value })} />
            </Field>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Assigned tech" htmlFor="nf-tech">
                <select id="nf-tech" className="input select-chevron" value={form.assignedToId} onChange={(e) => update({ assignedToId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {activePeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date received" htmlFor="nf-date">
                <input id="nf-date" type="date" className="input" value={form.dateReceived} onChange={(e) => update({ dateReceived: e.target.value })} />
              </Field>
            </div>
          </div>
        ) : null}

        {error ? (
          <div role="alert" className="rounded-lg border border-[#5a2222] bg-danger-bg px-3 py-2 text-[13px] text-danger">
            {error}
          </div>
        ) : null}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit} className="btn btn-primary">
            {saving ? "Creating…" : "Create ticket"}
          </button>
        </div>
        <p className="text-[11.5px] text-muted">
          Lands in {newColumn?.name ?? "New"}, owned by {defaultOwner?.name ?? "nobody"}, dated{" "}
          {form.dateReceived === todayDateOnly() ? "today" : form.dateReceived}.
        </p>
      </form>
    </Modal>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
    </div>
  );
}
