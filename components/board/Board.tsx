"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { NewTicketModal } from "@/components/ticket/NewTicketModal";
import { TicketPanel } from "@/components/ticket/TicketPanel";
import { useToast } from "@/components/ui/Toaster";
import { clsx } from "@/lib/clsx";
import { daysSince } from "@/lib/format";
import { fetchBoardData, fetchTicketById } from "@/lib/queries";
import { createClient } from "@/lib/supabase/client";
import { PAID_KEY, type BoardData, type Ticket, type TicketInsert, type TicketUpdate } from "@/lib/types";
import { BoardColumn } from "./BoardColumn";
import { EMPTY_FILTERS, FilterSelects, SearchInput, hasActiveFilters, type Filters } from "./BoardFilters";
import { TicketCard } from "./TicketCard";

const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : rectIntersection(args);
};

function matchesQuery(ticket: Ticket, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const bare = needle.replace(/^sc-?/, "");
  return (
    ticket.client.toLowerCase().includes(needle) ||
    ticket.code.toLowerCase().includes(needle) ||
    (bare !== "" && String(ticket.number).includes(bare)) ||
    ticket.title.toLowerCase().includes(needle)
  );
}

export function Board({ initial }: { initial: BoardData }) {
  const supabase = useMemo(() => createClient(), []);
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<BoardData>(initial);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [openId, setOpenId] = useState<string | null>(() => searchParams.get("t"));
  const [extraTicket, setExtraTicket] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [mobileIndex, setMobileIndex] = useState(0);
  const suppressClick = useRef(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  /* ---------- lookups ---------- */
  const peopleById = useMemo(() => new Map(data.people.map((p) => [p.id, p])), [data.people]);
  const categoriesById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const columnsById = useMemo(() => new Map(data.columns.map((c) => [c.id, c])), [data.columns]);
  const paidColumn = data.columns.find((c) => c.key === PAID_KEY);
  // New tickets land in the first column; the database applies the same rule.
  const newColumn = data.columns[0];

  /* ---------- refresh: realtime + polling + focus ---------- */
  const refresh = useCallback(async () => {
    try {
      const fresh = await fetchBoardData(supabase);
      setData(fresh);
    } catch (e) {
      console.error(e);
    }
  }, [supabase]);

  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), 250);
    };
    const channel = supabase
      .channel("board-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "board_columns" }, schedule)
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    const poll = window.setInterval(() => void refresh(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  /* ---------- open ticket (deep link ?t=) ---------- */
  const openTicket = useMemo(() => {
    if (!openId) return null;
    return data.tickets.find((t) => t.id === openId || t.code.toLowerCase() === openId.toLowerCase()) ?? (extraTicket?.id === openId ? extraTicket : null);
  }, [openId, data.tickets, extraTicket]);

  useEffect(() => {
    if (!openId || openTicket) return;
    // Not on the active board (archived or filtered out): fetch it directly.
    let cancelled = false;
    void fetchTicketById(supabase, openId)
      .then((t) => {
        if (cancelled) return;
        if (t) setExtraTicket(t);
        else setOpenId(null);
      })
      .catch(() => {
        if (!cancelled) setOpenId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [openId, openTicket, supabase]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (openId) url.searchParams.set("t", openId);
    else url.searchParams.delete("t");
    window.history.replaceState(null, "", url.toString());
  }, [openId]);

  /* ---------- mutations ---------- */
  const patchLocal = useCallback((id: string, patch: Partial<Ticket>) => {
    setData((d) => ({ ...d, tickets: d.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    setExtraTicket((t) => (t && t.id === id ? { ...t, ...patch } : t));
  }, []);

  const findTicket = useCallback(
    (id: string) => dataRef.current.tickets.find((t) => t.id === id) ?? (extraTicket?.id === id ? extraTicket : undefined),
    [extraTicket],
  );

  const moveTicket = useCallback(
    async (ticketId: string, columnId: string) => {
      const ticket = findTicket(ticketId);
      const column = columnsById.get(columnId);
      if (!ticket || !column || ticket.column_id === columnId) return;
      const previous = { ...ticket };
      patchLocal(ticketId, {
        column_id: columnId,
        owner_id: column.default_owner_id,
        column_entered_at: new Date().toISOString(),
      });
      const { data: moved, error } = await supabase.rpc("move_ticket", { p_ticket_id: ticketId, p_column_id: columnId });
      if (error) {
        patchLocal(ticketId, previous);
        toast.error(`Couldn't move ${ticket.code}: ${error.message}`);
        return;
      }
      if (moved) patchLocal(ticketId, moved);
    },
    [findTicket, columnsById, patchLocal, supabase, toast],
  );

  const updateTicket = useCallback(
    async (ticketId: string, patch: TicketUpdate) => {
      const ticket = findTicket(ticketId);
      if (!ticket) return false;
      const previous = { ...ticket };
      patchLocal(ticketId, patch as Partial<Ticket>);
      const { data: updated, error } = await supabase.from("tickets").update(patch).eq("id", ticketId).select("*").single();
      if (error) {
        patchLocal(ticketId, previous);
        toast.error(`Couldn't save ${ticket.code}: ${error.message}`);
        return false;
      }
      patchLocal(ticketId, updated);
      return true;
    },
    [findTicket, patchLocal, supabase, toast],
  );

  const recycleTicket = useCallback(
    async (ticketId: string) => {
      const ticket = findTicket(ticketId);
      if (!ticket) return false;
      const { error } = await supabase.rpc("recycle_ticket", { p_ticket_id: ticketId });
      if (error) {
        toast.error(`Couldn't move ${ticket.code} to the recycle bin: ${error.message}`);
        return false;
      }
      setData((d) => ({ ...d, tickets: d.tickets.filter((t) => t.id !== ticketId) }));
      setExtraTicket((t) => (t && t.id === ticketId ? null : t));
      setOpenId(null);
      toast.success(`${ticket.code} moved to the recycle bin`);
      return true;
    },
    [findTicket, supabase, toast],
  );

  const createTicket = useCallback(
    async (input: TicketInsert) => {
      const { data: created, error } = await supabase.from("tickets").insert(input).select("*").single();
      if (error) {
        toast.error(`Couldn't create ticket: ${error.message}`);
        return null;
      }
      setData((d) => ({ ...d, tickets: [created, ...d.tickets.filter((t) => t.id !== created.id)] }));
      setOpenId(created.id);
      toast.success(`${created.code} created`);
      return created;
    },
    [supabase, toast],
  );

  /* ---------- filtering ---------- */
  const q = filters.q.trim();
  const visible = useMemo(
    () =>
      data.tickets.filter((t) => {
        if (filters.category !== "all" && t.category_id !== filters.category) return false;
        if (filters.tech === "none" ? t.assigned_to_id !== null : filters.tech !== "all" && t.assigned_to_id !== filters.tech) return false;
        if (filters.owner === "none" ? t.owner_id !== null : filters.owner !== "all" && t.owner_id !== filters.owner) return false;
        if (filters.aging !== "all") {
          // Paid cards are done; aging only applies to live stages.
          if (t.column_id === paidColumn?.id) return false;
          if (daysSince(t.column_entered_at) < Number(filters.aging)) return false;
        }
        return matchesQuery(t, q);
      }),
    [data.tickets, filters.category, filters.tech, filters.owner, filters.aging, paidColumn?.id, q],
  );

  const byColumn = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    for (const c of data.columns) map.set(c.id, []);
    for (const t of visible) map.get(t.column_id)?.push(t);
    return map;
  }, [data.columns, visible]);

  /* ---------- drag and drop ---------- */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const onDragStart = (e: DragStartEvent) => {
    suppressClick.current = true;
    setActiveDragId(String(e.active.id));
  };
  const releaseClick = () => window.setTimeout(() => (suppressClick.current = false), 60);
  const onDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    releaseClick();
    if (e.over) void moveTicket(String(e.active.id), String(e.over.id));
  };
  const onDragCancel = () => {
    setActiveDragId(null);
    releaseClick();
  };
  const activeTicket = activeDragId ? data.tickets.find((t) => t.id === activeDragId) : undefined;

  const handleOpen = (id: string) => {
    if (suppressClick.current) return;
    setOpenId(id);
  };
  const closePanel = useCallback(() => {
    setOpenId(null);
    setExtraTicket(null);
    router.refresh();
  }, [router]);

  /* ---------- mobile column paging ---------- */
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || window.innerWidth >= 768) return;
    const width = el.clientWidth;
    if (width > 0) setMobileIndex(Math.round(el.scrollLeft / width));
  };
  const scrollToColumn = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setMobileIndex(index);
  };

  const filterProps = { filters, onChange: setFilters, categories: data.categories, people: data.people };
  const visibleCount = visible.length;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar>
        <div className="hidden md:contents">
          <div className="flex flex-wrap gap-2">
            <FilterSelects {...filterProps} />
          </div>
          <div className="ml-auto min-w-[180px] max-w-[300px] flex-[1_1_200px]">
            <SearchInput value={filters.q} onChange={(v) => setFilters((f) => ({ ...f, q: v }))} />
          </div>
          <button type="button" onClick={() => setShowNew(true)} className="btn btn-primary">
            + New ticket
          </button>
        </div>
        <span
          aria-label={live ? "Live updates connected" : "Live updates reconnecting; polling every 30 seconds"}
          title={live ? "Live" : "Polling"}
          className={clsx("hidden h-1.5 w-1.5 rounded-full md:block", live ? "bg-ok" : "bg-line-avatar")}
        />
      </TopBar>

      {/* Mobile toolbar */}
      <div className="flex flex-col gap-2 border-b border-header-line px-4 py-2.5 md:hidden">
        <div className="flex items-center gap-2">
          <SearchInput value={filters.q} onChange={(v) => setFilters((f) => ({ ...f, q: v }))} className="input flex-1" />
          <button
            type="button"
            onClick={() => setMobileFilters((v) => !v)}
            aria-expanded={mobileFilters}
            className={clsx("pill", hasActiveFilters({ ...filters, q: "" }) && "border-accent text-ink")}
          >
            Filters
          </button>
        </div>
        {mobileFilters ? (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <FilterSelects {...filterProps} />
          </div>
        ) : null}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none" role="tablist" aria-label="Columns">
          {data.columns.map((c, i) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={i === mobileIndex}
              onClick={() => scrollToColumn(i)}
              className={clsx("pill shrink-0", i === mobileIndex && "pill-accent")}
              style={{ padding: "7px 14px", backgroundImage: "none" }}
            >
              {c.name} <span className="font-mono text-[11px] opacity-80">{byColumn.get(c.id)?.length ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters(filters) ? (
        <div className="flex items-center gap-2 px-4 pt-3 text-[12px] text-label md:px-5">
          <span>
            Showing {visibleCount} of {data.tickets.length} tickets
          </span>
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="font-semibold text-link hover:text-link-hover">
            Clear filters
          </button>
        </div>
      ) : null}

      <DndContext id="service-board-dnd" sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex min-h-0 flex-1 snap-x snap-mandatory items-stretch gap-3.5 overflow-x-auto px-4 pb-6 pt-3 md:snap-none md:px-5 md:pt-[18px]"
        >
          {data.columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tickets={byColumn.get(column.id) ?? []}
              defaultOwner={column.default_owner_id ? peopleById.get(column.default_owner_id) : undefined}
              categoriesById={categoriesById}
              peopleById={peopleById}
              isPaid={column.id === paidColumn?.id}
              activeDragId={activeDragId}
              onOpen={handleOpen}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTicket ? (
            <div className="w-[calc(100vw-2rem)] md:w-[248px]">
              <TicketCard
                ticket={activeTicket}
                category={activeTicket.category_id ? categoriesById.get(activeTicket.category_id) : undefined}
                tech={activeTicket.assigned_to_id ? peopleById.get(activeTicket.assigned_to_id) : undefined}
                owner={activeTicket.owner_id ? peopleById.get(activeTicket.owner_id) : undefined}
                isPaid={activeTicket.column_id === paidColumn?.id}
                overlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Mobile FAB */}
      <button
        type="button"
        aria-label="New ticket"
        onClick={() => setShowNew(true)}
        className="fixed bottom-[22px] right-[18px] z-30 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-accent text-[26px] font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.5)] md:hidden"
      >
        +
      </button>

      {openTicket ? (
        <TicketPanel
          ticket={openTicket}
          columns={data.columns}
          people={data.people}
          categories={data.categories}
          onClose={closePanel}
          onUpdate={(patch) => updateTicket(openTicket.id, patch)}
          onMove={(columnId) => moveTicket(openTicket.id, columnId)}
          onRecycle={() => recycleTicket(openTicket.id)}
        />
      ) : null}

      {showNew ? (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          categories={data.categories}
          people={data.people}
          newColumn={newColumn}
          defaultOwner={newColumn?.default_owner_id ? peopleById.get(newColumn.default_owner_id) : undefined}
          onCreate={createTicket}
        />
      ) : null}
    </div>
  );
}
