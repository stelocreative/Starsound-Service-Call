import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { DAY_MS } from "./format";
import { PAID_KEY, type BoardData, type ReferenceData, type Ticket, type TicketDetail } from "./types";

export type Db = SupabaseClient<Database>;

/** Paid cards leave the board this many days after entering Paid. */
export const ARCHIVE_AFTER_DAYS = 14;

export function archiveCutoffIso(now: number = Date.now()): string {
  return new Date(now - ARCHIVE_AFTER_DAYS * DAY_MS).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  if (result.data === null) throw new Error(`${what}: no data`);
  return result.data;
}

export async function fetchReference(db: Db): Promise<ReferenceData> {
  const [columns, people, categories] = await Promise.all([
    db.from("board_columns").select("*").order("position", { ascending: true }),
    db.from("people").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    db.from("categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
  ]);
  return {
    columns: unwrap(columns, "Load columns"),
    people: unwrap(people, "Load people"),
    categories: unwrap(categories, "Load categories"),
  };
}

/** Active board: everything except Paid cards older than the archive cutoff. Newest arrivals first. */
export async function fetchBoardTickets(db: Db, paidColumnId: string | undefined): Promise<Ticket[]> {
  let query = db.from("tickets").select("*").order("column_entered_at", { ascending: false });
  if (paidColumnId) {
    query = query.or(`column_id.neq.${paidColumnId},column_entered_at.gte.${archiveCutoffIso()}`);
  }
  return unwrap(await query, "Load tickets");
}

export async function fetchBoardData(db: Db): Promise<BoardData> {
  const reference = await fetchReference(db);
  const paid = reference.columns.find((c) => c.key === PAID_KEY);
  const tickets = await fetchBoardTickets(db, paid?.id);
  return { ...reference, tickets };
}

/** All Paid tickets, most recently paid first. */
export async function fetchArchiveTickets(db: Db, paidColumnId: string): Promise<Ticket[]> {
  return unwrap(
    await db
      .from("tickets")
      .select("*")
      .eq("column_id", paidColumnId)
      .order("column_entered_at", { ascending: false }),
    "Load archive",
  );
}

export async function fetchTicketById(db: Db, ticketId: string): Promise<Ticket | null> {
  const { data, error } = await db.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  if (error) throw new Error(`Load ticket: ${error.message}`);
  return data;
}

export async function fetchTicketDetail(db: Db, ticketId: string): Promise<TicketDetail> {
  const [notes, attachments, moves] = await Promise.all([
    db.from("ticket_notes").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: false }),
    db
      .from("ticket_attachments")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false }),
    db.from("ticket_moves").select("*").eq("ticket_id", ticketId).order("moved_at", { ascending: false }),
  ]);
  return {
    notes: unwrap(notes, "Load notes"),
    attachments: unwrap(attachments, "Load attachments"),
    moves: unwrap(moves, "Load history"),
  };
}
