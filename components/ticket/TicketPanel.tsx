"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/components/CurrentUserProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { categoryStyle } from "@/lib/categories";
import { clsx } from "@/lib/clsx";
import { formatDate, safeFileName } from "@/lib/format";
import { fetchTicketDetail } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import {
  PAID_KEY,
  type AttachmentKind,
  type BoardColumn,
  type Category,
  type Person,
  type Ticket,
  type TicketAttachment,
  type TicketDetail,
  type TicketUpdate,
} from "@/lib/types";
import { Editable } from "./Editable";
import { AttachmentsSection, HistorySection, NotesSection } from "./TicketSections";
import { daysBadge } from "@/components/board/TicketCard";

type Props = {
  ticket: Ticket;
  columns: BoardColumn[];
  people: Person[];
  categories: Category[];
  onClose: () => void;
  onUpdate: (patch: TicketUpdate) => Promise<boolean>;
  onMove: (columnId: string) => Promise<void>;
  /** Moves the ticket to the recycle bin; resolves true when it is gone (the parent closes the panel). */
  onRecycle: () => Promise<boolean>;
};

const EMPTY_DETAIL: TicketDetail = { notes: [], attachments: [], moves: [] };

/** Slide-over (full screen on phones) with every field editable inline, notes, attachments and history. */
export function TicketPanel(props: Props) {
  // Keyed by ticket so notes/attachments/history state starts fresh for each ticket.
  return <TicketPanelContent key={props.ticket.id} {...props} />;
}

function TicketPanelContent({ ticket, columns, people, categories, onClose, onUpdate, onMove, onRecycle }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const user = useCurrentUser();
  const toast = useToast();
  const [detail, setDetail] = useState<TicketDetail>(EMPTY_DETAIL);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const column = columns.find((c) => c.id === ticket.column_id);
  const isPaid = column?.key === PAID_KEY;
  const category = categories.find((c) => c.id === ticket.category_id);
  const catStyle = categoryStyle(category);
  const badge = daysBadge(ticket, Boolean(isPaid));

  // People lists: active people, plus the currently selected person even if inactive.
  const techOptions = useMemo(() => peopleOptions(people, ticket.assigned_to_id), [people, ticket.assigned_to_id]);
  const ownerOptions = useMemo(() => peopleOptions(people, ticket.owner_id), [people, ticket.owner_id]);
  const categoryOptions = useMemo(
    () => categories.filter((c) => c.active || c.id === ticket.category_id),
    [categories, ticket.category_id],
  );

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Load on open, after local changes (reloadKey), and whenever the ticket changes column (history).
  useEffect(() => {
    let cancelled = false;
    loadDetail(supabase, ticket.id)
      .then((result) => {
        if (cancelled) return;
        setDetail(result.detail);
        setUrls(result.urls);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Could not load ticket details");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, ticket.id, ticket.column_entered_at, reloadKey, toast]);

  // Live updates for notes and attachments on this ticket.
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-${ticket.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_notes", filter: `ticket_id=eq.${ticket.id}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_attachments", filter: `ticket_id=eq.${ticket.id}` }, reload)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, ticket.id, reload]);

  // Escape closes (unless typing in a field); lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // While the delete confirmation is open, Escape belongs to it.
      if (e.key !== "Escape" || confirmDelete) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, confirmDelete]);

  const postNote = async (body: string) => {
    const optimistic = {
      id: `tmp-${Date.now()}`,
      ticket_id: ticket.id,
      author_id: user.id,
      author_name: user.displayName,
      body,
      created_at: new Date().toISOString(),
    };
    setDetail((d) => ({ ...d, notes: [optimistic, ...d.notes] }));
    const { error } = await supabase.from("ticket_notes").insert({
      ticket_id: ticket.id,
      author_id: user.id,
      author_name: user.displayName,
      body,
    });
    if (error) {
      setDetail((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== optimistic.id) }));
      toast.error(`Couldn't post note: ${error.message}`);
      return false;
    }
    reload();
    return true;
  };

  const upload = async (file: File, kind: AttachmentKind) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Files must be 25 MB or smaller.");
      return false;
    }
    const path = `${ticket.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      return false;
    }
    const { error: insertError } = await supabase.from("ticket_attachments").insert({
      ticket_id: ticket.id,
      kind,
      file_name: file.name,
      storage_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: user.id,
      uploaded_by_name: user.displayName,
    });
    if (insertError) {
      await supabase.storage.from("attachments").remove([path]);
      toast.error(`Upload failed: ${insertError.message}`);
      return false;
    }
    toast.success(`Uploaded ${file.name}`);
    reload();
    return true;
  };

  const deleteAttachment = async (attachment: TicketAttachment) => {
    const { error: storageError } = await supabase.storage.from("attachments").remove([attachment.storage_path]);
    if (storageError) {
      toast.error(`Couldn't delete file: ${storageError.message}`);
      return;
    }
    const { error } = await supabase.from("ticket_attachments").delete().eq("id", attachment.id);
    if (error) {
      toast.error(`Couldn't delete attachment: ${error.message}`);
      return;
    }
    reload();
  };

  const save = (patch: TicketUpdate) => onUpdate(patch);

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close ticket panel"
        onClick={onClose}
        className="anim-fade-in absolute inset-0 cursor-default bg-[rgba(3,5,10,0.6)]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${ticket.code} ${ticket.title}`}
        className="anim-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-line bg-panel shadow-[-14px_0_36px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <header className="flex flex-col gap-2.5 border-b border-line px-5 pb-4 pt-[18px] sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[12px] font-medium tracking-[0.04em] text-label">{ticket.code}</span>
            <select
              aria-label="Category"
              value={ticket.category_id ?? ""}
              onChange={(e) => void save({ category_id: e.target.value || null })}
              className="chip cursor-pointer appearance-none border-0 pr-5"
              style={{
                color: catStyle.chipFg,
                background: `${catStyle.chipBg} url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' fill='none' stroke='${encodeURIComponent(catStyle.chipFg)}' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/></svg>") no-repeat right 7px center`,
                fontFamily: "inherit",
              }}
              title="Category"
            >
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
            <span className="mono-badge" style={{ color: badge.fg, background: badge.bg }} title={badge.title}>
              {badge.text}
            </span>
            <button
              type="button"
              aria-label="Close panel"
              onClick={onClose}
              className="ml-auto flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-line-input bg-card text-[15px] text-ink-3 hover:text-ink"
            >
              ✕
            </button>
          </div>

          <Editable
            ariaLabel="Title"
            value={ticket.title}
            required
            maxLength={200}
            onSave={(v) => (v ? save({ title: v }) : false)}
            displayClassName="text-[21px] font-semibold leading-[1.25] text-ink-bright"
            inputClassName="text-[18px] font-semibold"
          />

          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Status"
              value={ticket.column_id}
              onChange={(e) => void onMove(e.target.value)}
              className="pill pill-select pill-accent"
              style={{ padding: "7px 12px" }}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  Status: {c.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Assigned tech"
              value={ticket.assigned_to_id ?? ""}
              onChange={(e) => void save({ assigned_to_id: e.target.value || null })}
              className="pill pill-select"
              style={{ padding: "7px 12px", backgroundColor: "var(--color-card)" }}
            >
              <option value="">Tech: Unassigned</option>
              {techOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  Tech: {p.name}
                  {p.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
            <select
              aria-label="Owner"
              value={ticket.owner_id ?? ""}
              onChange={(e) => void save({ owner_id: e.target.value || null })}
              className="pill pill-select"
              style={{ padding: "7px 12px", backgroundColor: "var(--color-card)" }}
            >
              <option value="">Owner: None</option>
              {ownerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  Owner: {p.name}
                  {p.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-5 pb-8 pt-[18px] sm:px-6">
          <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
            <Field label="Client">
              <Editable ariaLabel="Client" value={ticket.client} required maxLength={200} onSave={(v) => (v ? save({ client: v }) : false)} placeholder="Add client" />
            </Field>
            <Field label="Contact">
              <div className="flex flex-col gap-0.5">
                <Editable ariaLabel="Contact name" value={ticket.contact_name} onSave={(v) => save({ contact_name: v })} placeholder="Add contact name" />
                <Editable ariaLabel="Contact phone" type="tel" value={ticket.contact_phone} onSave={(v) => save({ contact_phone: v })} placeholder="Add phone" />
                <Editable ariaLabel="Contact email" type="email" value={ticket.contact_email} onSave={(v) => save({ contact_email: v })} placeholder="Add email" />
              </div>
            </Field>
            <Field label="Site address" className="sm:col-span-2">
              <Editable ariaLabel="Site address" value={ticket.site_address} onSave={(v) => save({ site_address: v })} placeholder="Add site address" />
            </Field>
            <Field label="Date received">
              <Editable ariaLabel="Date received" type="date" value={ticket.date_received} required format={(v) => formatDate(v)} onSave={(v) => (v ? save({ date_received: v }) : false)} />
            </Field>
            <Field label="First site visit">
              <Editable ariaLabel="First site visit" type="date" value={ticket.first_site_visit} format={(v) => formatDate(v)} onSave={(v) => save({ first_site_visit: v })} />
            </Field>
            <Field label="Scheduled">
              <Editable ariaLabel="Scheduled date" type="date" value={ticket.scheduled_date} format={(v) => formatDate(v)} onSave={(v) => save({ scheduled_date: v })} />
            </Field>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink-value">
                <input
                  type="checkbox"
                  aria-label="Replacement / upgrade"
                  checked={ticket.is_upgrade}
                  onChange={(e) => void save({ is_upgrade: e.target.checked })}
                  className="h-[15px] w-[15px] accent-accent"
                />
                Replacement / upgrade
              </label>
            </div>
          </div>

          <Field label="Description">
            <Editable
              ariaLabel="Description"
              type="textarea"
              value={ticket.description}
              onSave={(v) => save({ description: v })}
              placeholder="Add the request as it was taken"
              displayClassName="text-[13.5px] font-normal leading-[1.5] text-ink-3"
            />
          </Field>

          <NotesSection notes={detail.notes} people={people} loading={loading} onPost={postNote} />
          <AttachmentsSection attachments={detail.attachments} urls={urls} loading={loading} onUpload={upload} onDelete={deleteAttachment} />
          <HistorySection moves={detail.moves} columns={columns} loading={loading} />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-[12px] text-label">
            <span>Removed tickets wait in the recycle bin on the Archive page and can be restored.</span>
            <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-danger btn-sm">
              Move to recycle bin
            </button>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        title={`Move ${ticket.code} to the recycle bin?`}
        confirmLabel="Move to bin"
        busyLabel="Moving…"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          const gone = await onRecycle();
          if (!gone) setConfirmDelete(false);
        }}
        message={
          <>
            <span className="font-semibold text-ink-value">{ticket.title}</span> for {ticket.client} leaves the board but keeps its{" "}
            {detail.notes.length} note{detail.notes.length === 1 ? "" : "s"}, {detail.attachments.length} attachment
            {detail.attachments.length === 1 ? "" : "s"} and its history. Restore it any time from the bottom of the Archive page.
          </>
        }
      />
    </div>
  );
}

async function loadDetail(supabase: ReturnType<typeof createClient>, ticketId: string): Promise<{ detail: TicketDetail; urls: Record<string, string> }> {
  const detail = await fetchTicketDetail(supabase, ticketId);
  const urls: Record<string, string> = {};
  if (detail.attachments.length > 0) {
    const { data } = await supabase.storage
      .from("attachments")
      .createSignedUrls(
        detail.attachments.map((a) => a.storage_path),
        60 * 60,
        { download: true },
      );
    data?.forEach((entry, i) => {
      if (entry.signedUrl) urls[detail.attachments[i].id] = entry.signedUrl;
    });
  }
  return { detail, urls };
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("min-w-0", className)}>
      <div className="field-label mb-0.5">{label}</div>
      <div className="text-[13.5px] font-medium">{children}</div>
    </div>
  );
}

function peopleOptions(people: Person[], selectedId: string | null): Person[] {
  return people.filter((p) => p.active || p.id === selectedId);
}
