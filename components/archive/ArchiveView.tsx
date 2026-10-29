"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { TicketPanel } from "@/components/ticket/TicketPanel";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryChip, UpgradeBadge } from "@/components/ui/Chip";
import { useToast } from "@/components/ui/Toaster";
import { categoryStyle } from "@/lib/categories";
import { daysSince, formatDate } from "@/lib/format";
import { ARCHIVE_AFTER_DAYS, fetchArchiveTickets } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { PAID_KEY, type ReferenceData, type Ticket, type TicketUpdate } from "@/lib/types";

/** Every Paid ticket, forever, searchable by client, title or ticket number. */
export function ArchiveView({ reference, initialTickets }: { reference: ReferenceData; initialTickets: Ticket[] }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState(initialTickets);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(() => searchParams.get("t"));

  const paid = reference.columns.find((c) => c.key === PAID_KEY);
  const peopleById = useMemo(() => new Map(reference.people.map((p) => [p.id, p])), [reference.people]);
  const categoriesById = useMemo(() => new Map(reference.categories.map((c) => [c.id, c])), [reference.categories]);

  const refresh = useCallback(async () => {
    if (!paid) return;
    try {
      setTickets(await fetchArchiveTickets(supabase, paid.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not refresh the archive");
    }
  }, [paid, supabase, toast]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (openId) url.searchParams.set("t", openId);
    else url.searchParams.delete("t");
    window.history.replaceState(null, "", url.toString());
  }, [openId]);

  const needle = q.trim().toLowerCase();
  const bare = needle.replace(/^sc-?/, "");
  const filtered = useMemo(
    () =>
      tickets.filter(
        (t) =>
          !needle ||
          t.client.toLowerCase().includes(needle) ||
          t.title.toLowerCase().includes(needle) ||
          t.code.toLowerCase().includes(needle) ||
          (bare !== "" && String(t.number).includes(bare)),
      ),
    [tickets, needle, bare],
  );

  const openTicket = openId ? tickets.find((t) => t.id === openId || t.code.toLowerCase() === openId.toLowerCase()) ?? null : null;

  const updateTicket = async (id: string, patch: TicketUpdate) => {
    const previous = tickets.find((t) => t.id === id);
    if (!previous) return false;
    setTickets((list) => list.map((t) => (t.id === id ? { ...t, ...(patch as Partial<Ticket>) } : t)));
    const { data, error } = await supabase.from("tickets").update(patch).eq("id", id).select("*").single();
    if (error) {
      setTickets((list) => list.map((t) => (t.id === id ? previous : t)));
      toast.error(`Couldn't save ${previous.code}: ${error.message}`);
      return false;
    }
    setTickets((list) => list.map((t) => (t.id === id ? data : t)));
    return true;
  };

  const moveTicket = async (id: string, columnId: string) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || ticket.column_id === columnId) return;
    const { data, error } = await supabase.rpc("move_ticket", { p_ticket_id: id, p_column_id: columnId });
    if (error) {
      toast.error(`Couldn't move ${ticket.code}: ${error.message}`);
      return;
    }
    if (data && data.column_id !== paid?.id) {
      toast.success(`${ticket.code} is back on the board`);
      setOpenId(null);
      setTickets((list) => list.filter((t) => t.id !== id));
    } else if (data) {
      setTickets((list) => list.map((t) => (t.id === id ? data : t)));
    }
  };

  const deleteTicket = async (id: string) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return false;
    const { data: files, error: listError } = await supabase.from("ticket_attachments").select("storage_path").eq("ticket_id", id);
    if (listError) {
      toast.error(`Couldn't delete ${ticket.code}: ${listError.message}`);
      return false;
    }
    if (files && files.length > 0) {
      const { error: storageError } = await supabase.storage.from("attachments").remove(files.map((f) => f.storage_path));
      if (storageError) {
        toast.error(`Couldn't delete ${ticket.code}'s files: ${storageError.message}`);
        return false;
      }
    }
    const { error } = await supabase.from("tickets").delete().eq("id", id);
    if (error) {
      toast.error(`Couldn't delete ${ticket.code}: ${error.message}`);
      return false;
    }
    setOpenId(null);
    setTickets((list) => list.filter((t) => t.id !== id));
    toast.success(`${ticket.code} deleted`);
    return true;
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar>
        <div className="ml-auto min-w-[160px] max-w-[320px] flex-[1_1_200px]">
          <input
            type="search"
            aria-label="Search archive"
            placeholder="Search client, title or ticket #"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input"
            style={{ padding: "7px 12px", fontSize: 13 }}
          />
        </div>
      </TopBar>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-5 md:px-5">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-heading text-[15px] font-bold uppercase tracking-[0.1em] text-ink-value">Archive</h1>
          <span className="mono-badge bg-chip text-badge-fg" style={{ fontSize: 11 }}>
            {filtered.length}
          </span>
          <p className="text-[12.5px] text-label">
            Paid tickets. Cards leave the board {ARCHIVE_AFTER_DAYS} days after entering Paid and stay here forever.
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-panel border border-dashed border-line-card px-4 py-10 text-center text-[13px] text-muted">
            {tickets.length === 0 ? "Nothing has been paid yet." : "No archived tickets match that search."}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((t) => {
              const category = t.category_id ? categoriesById.get(t.category_id) : undefined;
              const tech = t.assigned_to_id ? peopleById.get(t.assigned_to_id) : undefined;
              const owner = t.owner_id ? peopleById.get(t.owner_id) : undefined;
              const onBoard = daysSince(t.column_entered_at) < ARCHIVE_AFTER_DAYS;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(t.id)}
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-card border border-line-card bg-card px-3.5 py-2.5 text-left hover:border-[#343c4d]"
                    style={{ borderLeft: `4px solid ${categoryStyle(category).stripe}` }}
                  >
                    <span className="w-[72px] font-mono text-[11.5px] font-medium tracking-[0.04em] text-label">{t.code}</span>
                    <span className="min-w-[200px] flex-1">
                      <span className="block text-[14px] font-semibold leading-tight text-ink">{t.title}</span>
                      <span className="block text-[12.5px] text-ink-2">{t.client}</span>
                    </span>
                    <CategoryChip category={category} />
                    {t.is_upgrade ? <UpgradeBadge /> : null}
                    <span className="font-mono text-[11px] text-label" title="Paid on">
                      Paid {formatDate(t.column_entered_at, false)}
                      {onBoard ? " · on board" : ""}
                    </span>
                    <span className="flex gap-1">
                      <Avatar kind="tech" initials={tech?.initials} title={tech ? `Tech: ${tech.name}` : "No tech assigned"} />
                      {owner ? <Avatar kind="owner" initials={owner.initials} title={`Owner: ${owner.name}`} /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {openTicket ? (
        <TicketPanel
          ticket={openTicket}
          columns={reference.columns}
          people={reference.people}
          categories={reference.categories}
          onClose={() => {
            setOpenId(null);
            void refresh();
            router.refresh();
          }}
          onUpdate={(patch) => updateTicket(openTicket.id, patch)}
          onMove={(columnId) => moveTicket(openTicket.id, columnId)}
          onDelete={() => deleteTicket(openTicket.id)}
        />
      ) : null}
    </div>
  );
}
