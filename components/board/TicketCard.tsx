"use client";

import { useDraggable } from "@dnd-kit/core";
import { Avatar } from "@/components/ui/Avatar";
import { CategoryChip, UpgradeBadge } from "@/components/ui/Chip";
import { categoryStyle } from "@/lib/categories";
import { clsx } from "@/lib/clsx";
import { agingTier, daysSince } from "@/lib/format";
import type { Category, Person, Ticket } from "@/lib/types";

type Props = {
  ticket: Ticket;
  category: Category | undefined;
  tech: Person | undefined;
  owner: Person | undefined;
  isPaid: boolean;
  onOpen?: () => void;
  /** Rendered in the DragOverlay: not draggable itself, styled as lifted. */
  overlay?: boolean;
  /** The real card while its overlay is being dragged. */
  dimmed?: boolean;
};

export function daysBadge(ticket: Ticket, isPaid: boolean) {
  if (isPaid) return { text: "Paid", fg: "#6FDCA6", bg: "#0F2E1F", title: "Paid" };
  const days = daysSince(ticket.column_entered_at);
  const tier = agingTier(days);
  return {
    text: `${days}d`,
    fg: tier?.fg ?? "#9AA3B8",
    bg: tier?.bg ?? "#1C222E",
    title: `${days} day${days === 1 ? "" : "s"} in this column${tier ? ` · aging ${tier.label}` : ""}`,
  };
}

/** Collapsed card: number, title, client, category, tech + owner initials, days in column. Nothing else. */
export function TicketCard({ ticket, category, tech, owner, isPaid, onOpen, overlay = false, dimmed = false }: Props) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: ticket.id,
    data: { columnId: ticket.column_id },
    disabled: overlay,
  });
  const style = categoryStyle(category);
  const badge = daysBadge(ticket, isPaid);

  return (
    <button
      ref={overlay ? undefined : setNodeRef}
      type="button"
      onClick={onOpen}
      aria-label={`${ticket.code}: ${ticket.title}, ${ticket.client}`}
      {...(overlay ? {} : listeners)}
      {...(overlay ? {} : attributes)}
      className={clsx(
        "flex w-full select-none flex-col gap-1.5 rounded-card border border-line-card bg-card px-3 py-2.5 text-left text-ink transition-[opacity,border-color,transform] duration-100",
        overlay ? "cursor-grabbing shadow-[0_16px_36px_rgba(0,0,0,0.55)] ring-1 ring-accent/40" : "cursor-grab hover:border-[#343c4d]",
        dimmed && "opacity-35",
      )}
      style={{ borderLeft: `4px solid ${style.stripe}`, touchAction: overlay ? undefined : "manipulation" }}
    >
      <div className="flex w-full items-center gap-2">
        <span className="font-mono text-[11px] font-medium tracking-[0.04em] text-label">{ticket.code}</span>
        <span className="mono-badge ml-auto" style={{ color: badge.fg, background: badge.bg }} title={badge.title} aria-label={badge.title}>
          {badge.text}
        </span>
      </div>
      <div className="text-[14px] font-semibold leading-[1.3] text-ink">{ticket.title}</div>
      <div className="text-[12.5px] text-ink-2">{ticket.client}</div>
      <div className="mt-0.5 flex w-full items-center gap-1.5">
        <CategoryChip category={category} />
        {ticket.is_upgrade ? <UpgradeBadge /> : null}
        <div className="ml-auto flex gap-1">
          <Avatar kind="tech" initials={tech?.initials} title={tech ? `Tech: ${tech.name}` : "No tech assigned"} />
          {owner ? <Avatar kind="owner" initials={owner.initials} title={`Owner: ${owner.name}`} /> : null}
        </div>
      </div>
    </button>
  );
}
