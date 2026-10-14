"use client";

import { useDroppable } from "@dnd-kit/core";
import { clsx } from "@/lib/clsx";
import type { BoardColumn as Column, Category, Person, Ticket } from "@/lib/types";
import { TicketCard } from "./TicketCard";

type Props = {
  column: Column;
  tickets: Ticket[];
  defaultOwner: Person | undefined;
  categoriesById: Map<string, Category>;
  peopleById: Map<string, Person>;
  isPaid: boolean;
  activeDragId: string | null;
  onOpen: (ticketId: string) => void;
};

/** A board column. The whole column, including the space under the cards, is the drop target. */
export function BoardColumn({
  column,
  tickets,
  defaultOwner,
  categoriesById,
  peopleById,
  isPaid,
  activeDragId,
  onOpen,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${column.name} column, ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}
      data-column-key={column.key}
      className={clsx(
        "flex h-full w-[calc(100vw-2rem)] shrink-0 snap-start flex-col gap-2 rounded-panel border bg-surface p-2.5 pb-3 transition-colors md:w-[268px]",
        isOver ? "border-accent" : "border-line",
      )}
    >
      <header className="flex items-baseline gap-2 px-1 pt-0.5">
        <h2 className="font-heading text-[13px] font-bold uppercase tracking-[0.1em] text-ink-value">{column.name}</h2>
        <span className="mono-badge bg-chip text-badge-fg" style={{ fontSize: 11 }}>
          {tickets.length}
        </span>
        <span className="ml-auto truncate text-[11px] text-label" title={column.description ?? undefined}>
          {defaultOwner ? defaultOwner.name : ""}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {tickets.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-card px-2 pb-2.5 pt-3.5 text-center text-[12px] text-muted">
            No tickets
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              category={ticket.category_id ? categoriesById.get(ticket.category_id) : undefined}
              tech={ticket.assigned_to_id ? peopleById.get(ticket.assigned_to_id) : undefined}
              owner={ticket.owner_id ? peopleById.get(ticket.owner_id) : undefined}
              isPaid={isPaid}
              dimmed={activeDragId === ticket.id}
              onOpen={() => onOpen(ticket.id)}
            />
          ))
        )}
        {/* Empty space below the cards stays part of the drop target. */}
        <div className="min-h-8 flex-1" aria-hidden="true" />
      </div>
    </section>
  );
}
