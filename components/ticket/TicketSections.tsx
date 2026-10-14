"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { ATTACHMENT_KINDS, type AttachmentKind, type BoardColumn, type Person, type TicketAttachment, type TicketMove, type TicketNote } from "@/lib/types";
import { fileKindLabel, formatBytes, formatDate, formatDateTime, initialsFor } from "@/lib/format";

/* ---------------- Notes ---------------- */

export function NotesSection({
  notes,
  people,
  loading,
  onPost,
}: {
  notes: TicketNote[];
  people: Person[];
  loading: boolean;
  onPost: (body: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    const ok = await onPost(body);
    setPosting(false);
    if (ok) setDraft("");
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="notes-heading">
      <h3 id="notes-heading" className="section-label">
        Notes
      </h3>
      <form onSubmit={submit} className="flex gap-2">
        <input
          aria-label="Add a note"
          placeholder="Add a note"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="input flex-1"
          style={{ fontSize: 13 }}
          disabled={posting}
        />
        <button type="submit" disabled={!draft.trim() || posting} className="btn btn-primary">
          {posting ? "Posting…" : "Post"}
        </button>
      </form>
      {loading && notes.length === 0 ? <div className="text-[12.5px] text-muted">Loading…</div> : null}
      {!loading && notes.length === 0 ? <div className="text-[12.5px] text-muted">No notes yet.</div> : null}
      <ul className="flex flex-col gap-2.5">
        {notes.map((note) => (
          <li key={note.id} className="flex gap-2.5">
            <Avatar kind="note" initials={initialsForAuthor(note.author_name, people)} size={24} title={note.author_name} />
            <div className="min-w-0">
              <div className="text-[12px] text-label">
                <span className="font-semibold text-ink-value">{note.author_name}</span> ·{" "}
                <time className="font-mono text-[11px]" dateTime={note.created_at}>
                  {formatDateTime(note.created_at)}
                </time>
              </div>
              <div className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.45] text-ink-3">{note.body}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function initialsForAuthor(name: string, people: Person[]): string {
  const person = people.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  return person?.initials ?? initialsFor(name);
}

/* ---------------- Attachments ---------------- */

const KIND_STYLE: Record<AttachmentKind, { fg: string; bg: string }> = {
  quote: { fg: "#8FB8FF", bg: "#15294D" },
  invoice: { fg: "#6FDCA6", bg: "#0F2E1F" },
  other: { fg: "#9AA3B8", bg: "#1C222E" },
};

export function kindLabel(kind: string) {
  return ATTACHMENT_KINDS.find((k) => k.value === kind)?.label ?? "Other";
}

export function AttachmentsSection({
  attachments,
  urls,
  loading,
  onUpload,
  onDelete,
}: {
  attachments: TicketAttachment[];
  urls: Record<string, string>;
  loading: boolean;
  onUpload: (file: File, kind: AttachmentKind) => Promise<boolean>;
  onDelete: (attachment: TicketAttachment) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AttachmentKind>("quote");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    const ok = await onUpload(file, kind);
    setUploading(false);
    if (ok) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
    }
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="attachments-heading">
      <div className="flex items-center gap-2.5">
        <h3 id="attachments-heading" className="section-label">
          Attachments
        </h3>
        <button type="button" onClick={() => setOpen((v) => !v)} className="pill ml-auto" style={{ padding: "4px 10px", fontSize: 12 }} aria-expanded={open}>
          + Upload
        </button>
      </div>

      {open ? (
        <form onSubmit={submit} className="flex flex-col gap-2 rounded-card border border-line-soft bg-surface p-2.5 sm:flex-row sm:items-center">
          <input
            ref={fileRef}
            type="file"
            aria-label="Choose a file"
            accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="min-w-0 flex-1 text-[12.5px] text-ink-3 file:mr-2 file:rounded-md file:border file:border-line-input file:bg-card file:px-2.5 file:py-1 file:text-[12px] file:font-semibold file:text-ink-3"
          />
          <select aria-label="Attachment type" value={kind} onChange={(e) => setKind(e.target.value as AttachmentKind)} className="pill pill-select" style={{ padding: "5px 10px" }}>
            {ATTACHMENT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!file || uploading} className="btn btn-primary btn-sm">
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      ) : null}

      {loading && attachments.length === 0 ? <div className="text-[12.5px] text-muted">Loading…</div> : null}
      {!loading && attachments.length === 0 ? <div className="text-[12.5px] text-muted">No attachments yet.</div> : null}
      <ul className="flex flex-col gap-2">
        {attachments.map((a) => {
          const style = KIND_STYLE[(a.kind as AttachmentKind) in KIND_STYLE ? (a.kind as AttachmentKind) : "other"];
          const url = urls[a.id];
          return (
            <li key={a.id} className="flex items-center gap-2.5 rounded-card border border-line-soft bg-surface px-2.5 py-2">
              <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] bg-raised font-mono text-[9px] font-semibold text-badge-fg">
                {fileKindLabel(a.file_name, a.mime_type)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink-value" title={a.file_name}>
                  {a.file_name}
                </div>
                <div className="text-[11.5px] text-label">
                  {a.uploaded_by_name} · {formatDate(a.created_at, false)}
                  {a.size_bytes ? ` · ${formatBytes(a.size_bytes)}` : ""}
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2.5">
                <Chip fg={style.fg} bg={style.bg}>
                  {kindLabel(a.kind)}
                </Chip>
                {url ? (
                  <a href={url} className="text-[12.5px] font-semibold" target="_blank" rel="noopener noreferrer">
                    Download
                  </a>
                ) : (
                  <span className="text-[12.5px] text-muted">…</span>
                )}
                <button
                  type="button"
                  aria-label={`Delete ${a.file_name}`}
                  title="Delete attachment"
                  onClick={() => {
                    if (window.confirm(`Delete ${a.file_name}? This cannot be undone.`)) void onDelete(a);
                  }}
                  className="rounded px-1 text-[14px] leading-none text-label hover:bg-card hover:text-danger"
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- History ---------------- */

export function HistorySection({ moves, columns, loading }: { moves: TicketMove[]; columns: BoardColumn[]; loading: boolean }) {
  // Moves snapshot column names, so history survives renamed or deleted columns.
  const name = (id: string | null) => (id ? (columns.find((c) => c.id === id)?.name ?? null) : null);
  return (
    <section className="flex flex-col gap-1.5" aria-labelledby="history-heading">
      <h3 id="history-heading" className="section-label">
        History
      </h3>
      {loading && moves.length === 0 ? <div className="text-[12.5px] text-muted">Loading…</div> : null}
      <ol className="flex flex-col gap-1.5">
        {moves.map((m) => {
          const from = m.from_column_name ?? name(m.from_column_id);
          const to = m.to_column_name ?? name(m.to_column_id) ?? "a removed column";
          return (
            <li key={m.id} className="text-[12.5px] text-label">
              <span className="font-semibold text-ink-value">{from ? `${from} → ${to}` : `Created in ${to}`}</span> · {m.moved_by_name} ·{" "}
              <time className="font-mono text-[11px]" dateTime={m.moved_at}>
                {formatDateTime(m.moved_at)}
              </time>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
