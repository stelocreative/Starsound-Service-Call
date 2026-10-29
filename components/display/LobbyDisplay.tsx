"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CATEGORY_PALETTE, isCategoryColor } from "@/lib/categories";
import { clsx } from "@/lib/clsx";
import {
  DISPLAY_PAGE_MS,
  DISPLAY_POLL_MS,
  DISPLAY_RELOAD_MS,
  STAGE_H,
  STAGE_W,
  type DisplaySnapshot,
  type DisplayTicket,
} from "@/lib/display";
import { agingTier, daysSince, formatDate, toDateOnly, todayDateOnly } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { PAID_KEY } from "@/lib/types";

type Status = "loading" | "live" | "reconnecting" | "invalid";

/* Stage geometry in px inside the fixed 1920×1080 stage; the stage itself scales to the screen. */
const PAD = 28;
const HEADER_H = 72;
const FOOTER_H = 32;
const GAP = 16;
const LANE_PAD = 10;
const LANE_HEADER_H = 36;
const MAX_LANES_PER_ROW = 6;
const LANES_TOP = PAD + HEADER_H + GAP;
const LANES_H = STAGE_H - LANES_TOP - GAP - FOOTER_H - PAD;
/* Card sizes, largest first; the biggest one where every lane still fits without paging wins. */
const CARD = {
  large: { h: 172, gap: 12, pad: "10px 14px", code: 17, badge: 16, client: 26, title: 20, twoLines: true },
  roomy: { h: 100, gap: 10, pad: "10px 14px", code: 16, badge: 15, client: 23, title: 18, twoLines: false },
  compact: { h: 84, gap: 8, pad: "7px 12px", code: 15, badge: 14, client: 21, title: 17, twoLines: false },
} as const;
type CardSize = keyof typeof CARD;
const CARD_SIZES: CardSize[] = ["large", "roomy", "compact"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Lane = { id: string; key: string; name: string; tickets: DisplayTicket[] };
type Person = { id: string; name: string; initials: string };
type CategoryRef = { id: string; name: string; color: string };

type Model = {
  /** Stages with at least one card, in board order. */
  lanes: Lane[];
  /** Stages with nothing in them (listed in the footer). */
  empty: Lane[];
  rows: Lane[][];
  size: CardSize;
  /** Cards per lane page. */
  capacity: number;
  laneWidth: number;
  laneHeight: number;
  paidId: string | null;
  people: Map<string, Person>;
  categories: Map<string, CategoryRef>;
  /** Categories in use on the board, for the legend. */
  legend: CategoryRef[];
  stats: { open: number; today: number; aging30: number };
};

function stripeFor(color: string): string {
  return isCategoryColor(color) ? CATEGORY_PALETTE[color].stripe : CATEGORY_PALETTE.gray.stripe;
}

function buildModel(s: DisplaySnapshot): Model {
  const people = new Map(s.people.map((p) => [p.id, p]));
  const categories = new Map(s.categories.map((c) => [c.id, c]));
  const paidId = s.columns.find((c) => c.key === PAID_KEY)?.id ?? null;

  const byColumn = new Map<string, DisplayTicket[]>();
  for (const t of s.tickets) {
    const list = byColumn.get(t.column_id) ?? [];
    list.push(t);
    byColumn.set(t.column_id, list);
  }
  const all: Lane[] = [...s.columns]
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ id: c.id, key: c.key, name: c.name, tickets: byColumn.get(c.id) ?? [] }));
  const lanes = all.filter((l) => l.tickets.length > 0);
  const empty = all.filter((l) => l.tickets.length === 0);

  const rowCount = lanes.length > MAX_LANES_PER_ROW ? 2 : 1;
  const perRow = Math.max(1, Math.ceil(lanes.length / rowCount));
  const rows: Lane[][] = [];
  for (let i = 0; i < lanes.length; i += perRow) rows.push(lanes.slice(i, i + perRow));
  const laneHeight = (LANES_H - GAP * (rowCount - 1)) / rowCount;
  const laneWidth = (STAGE_W - PAD * 2 - GAP * (perRow - 1)) / perRow;
  const body = laneHeight - LANE_HEADER_H - LANE_PAD * 3;
  const fits = (size: CardSize) => Math.max(1, Math.floor((body + CARD[size].gap) / (CARD[size].h + CARD[size].gap)));
  const busiest = lanes.reduce((m, l) => Math.max(m, l.tickets.length), 0);
  const size = CARD_SIZES.find((c) => busiest <= fits(c)) ?? "compact";
  const capacity = fits(size);

  const today = todayDateOnly();
  const used = new Set<string>();
  let open = 0;
  let todayCount = 0;
  let aging30 = 0;
  for (const t of s.tickets) {
    if (t.category_id) used.add(t.category_id);
    if (t.column_id === paidId) continue;
    open += 1;
    if (t.scheduled_date === today) todayCount += 1;
    if (daysSince(t.column_entered_at) >= 30) aging30 += 1;
  }
  const legend = s.categories.filter((c) => used.has(c.id));

  return {
    lanes,
    empty,
    rows,
    size,
    capacity,
    laneWidth,
    laneHeight,
    paidId,
    people,
    categories,
    legend,
    stats: { open, today: todayCount, aging30 },
  };
}

/* Clock, pager and screen fit come from external stores, so nothing sets state inside an effect. */
const subscribeEverySecond = (cb: () => void) => {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
};
const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const getSeconds = () => Math.floor(Date.now() / 1000);
const getPage = () => Math.floor(Date.now() / DISPLAY_PAGE_MS);
const getScale = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
const serverZero = () => 0;
const serverOne = () => 1;

function clockText(date: Date, withSeconds = false): string {
  let h = date.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = withSeconds ? `:${String(date.getSeconds()).padStart(2, "0")}` : "";
  return `${h}:${mm}${ss} ${ampm}`;
}

/** The lobby TV: view-only, polls every 15 s, scales a 1920×1080 layout to the screen. */
export function LobbyDisplay({ displayKey }: { displayKey: string }) {
  const [snapshot, setSnapshot] = useState<DisplaySnapshot | null>(null);
  const [status, setStatus] = useState<Status>(displayKey ? "loading" : "invalid");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const healthy = useRef(false);
  const scale = useSyncExternalStore(subscribeResize, getScale, serverOne);
  const tick = useSyncExternalStore(subscribeEverySecond, getPage, serverZero);

  useEffect(() => {
    if (!displayKey) return;
    const supabase = createClient();
    let cancelled = false;
    const poll = async () => {
      const { data, error } = await supabase.rpc("display_snapshot", { p_key: displayKey });
      if (cancelled) return;
      if (error) {
        healthy.current = false;
        // 42501 is the function's own "not valid" error; anything else is a network or server hiccup.
        setStatus(error.code === "42501" ? "invalid" : "reconnecting");
        return;
      }
      healthy.current = true;
      setSnapshot(data as unknown as DisplaySnapshot);
      setUpdatedAt(new Date());
      setStatus("live");
    };
    void poll();
    const id = window.setInterval(() => void poll(), DISPLAY_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [displayKey]);

  // Pick up deploys without anyone touching the Pi; never reload while the board is unreachable.
  useEffect(() => {
    let id = 0;
    const schedule = (ms: number) => {
      id = window.setTimeout(() => {
        if (healthy.current) window.location.reload();
        else schedule(10 * 60 * 1000);
      }, ms);
    };
    schedule(DISPLAY_RELOAD_MS);
    return () => window.clearTimeout(id);
  }, []);

  const model = useMemo(() => (snapshot ? buildModel(snapshot) : null), [snapshot]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-app text-ink">
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {status === "invalid" ? (
          <InvalidLink />
        ) : model ? (
          <Stage model={model} status={status} updatedAt={updatedAt} tick={tick} />
        ) : (
          <Connecting status={status} />
        )}
      </div>
    </div>
  );
}

function Stage({ model, status, updatedAt, tick }: { model: Model; status: Status; updatedAt: Date | null; tick: number }) {
  return (
    <div className="absolute inset-0" style={{ padding: PAD }}>
      <Header model={model} status={status} updatedAt={updatedAt} />
      <div
        className="flex flex-col"
        style={{ position: "absolute", top: LANES_TOP, left: PAD, right: PAD, height: LANES_H, gap: GAP }}
      >
        {model.lanes.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-panel border border-dashed border-line-dashed">
            <div className="text-center">
              <div className="font-heading text-[40px] font-bold text-ink-bright">The board is clear</div>
              <div className="mt-2 text-[20px] text-ink-2">No open tickets right now.</div>
            </div>
          </div>
        ) : (
          model.rows.map((row, i) => (
            <div key={i} className="flex" style={{ gap: GAP, height: model.laneHeight }}>
              {row.map((lane) => (
                <LaneView key={lane.id} lane={lane} model={model} tick={tick} />
              ))}
            </div>
          ))
        )}
      </div>
      <Footer model={model} />
    </div>
  );
}

function Header({ model, status, updatedAt }: { model: Model; status: Status; updatedAt: Date | null }) {
  const { open, today, aging30 } = model.stats;
  return (
    <header className="flex items-center" style={{ height: HEADER_H, gap: 40 }}>
      <div className="shrink-0">
        <div className="font-heading text-[32px] font-bold leading-none tracking-[0.06em] text-ink-bright">
          STARSOUND <span className="text-brand">OS</span>
        </div>
        <div className="mt-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-label">Service board · Lobby display</div>
      </div>
      <div className="flex items-center border-l border-line" style={{ gap: 36, paddingLeft: 40 }}>
        <Stat value={open} label="Open tickets" />
        <Stat value={today} label="Scheduled today" accent={today > 0 ? "#8FB8FF" : undefined} />
        <Stat value={aging30} label="Aging 30+ days" accent={aging30 > 0 ? "#FF9A9A" : undefined} />
      </div>
      <div className="ml-auto flex items-center" style={{ gap: 32 }}>
        <LivePill status={status} updatedAt={updatedAt} />
        <Clock />
      </div>
    </header>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent?: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-heading text-[38px] font-bold leading-none tabular-nums" style={{ color: accent ?? "#F2F4FA" }}>
        {value}
      </span>
      <span className="mt-1.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-label">{label}</span>
    </div>
  );
}

function Clock() {
  const seconds = useSyncExternalStore(subscribeEverySecond, getSeconds, serverZero);
  if (seconds === 0) return <div style={{ width: 220, height: 60 }} aria-hidden />;
  const d = new Date(seconds * 1000);
  const [time, ampm] = clockText(d).split(" ");
  return (
    <div className="text-right">
      <div className="font-heading text-[46px] font-bold leading-none tabular-nums text-ink-bright">
        {time}
        <span className="ml-2 text-[20px] font-semibold text-ink-2">{ampm}</span>
      </div>
      <div className="mt-1.5 text-[15px] font-semibold uppercase tracking-[0.12em] text-label">
        {WEEKDAYS[d.getDay()]}, {formatDate(toDateOnly(d), false)}
      </div>
    </div>
  );
}

function LivePill({ status, updatedAt }: { status: Status; updatedAt: Date | null }) {
  const live = status === "live";
  const color = live ? "#6FDCA6" : "#F0B35C";
  return (
    <div
      className="flex items-center rounded-full border"
      style={{ gap: 12, padding: "8px 18px", borderColor: live ? "#1F4D36" : "#4A3A14", background: live ? "#0F2E1F" : "#33250D" }}
      role="status"
    >
      <span className={clsx("inline-block rounded-full", live && "animate-pulse")} style={{ width: 12, height: 12, background: color }} />
      <span className="font-mono text-[15px] font-semibold tracking-[0.1em]" style={{ color }}>
        {live ? "LIVE" : status === "loading" ? "CONNECTING" : "RECONNECTING"}
      </span>
      {updatedAt ? (
        <span className="font-mono text-[13px] text-label">
          {live ? "updated" : "last update"} {clockText(updatedAt, true)}
        </span>
      ) : null}
    </div>
  );
}

function LaneView({ lane, model, tick }: { lane: Lane; model: Model; tick: number }) {
  const pages = Math.max(1, Math.ceil(lane.tickets.length / model.capacity));
  const page = pages > 1 ? tick % pages : 0;
  const visible = lane.tickets.slice(page * model.capacity, (page + 1) * model.capacity);
  const card = CARD[model.size];
  return (
    <section
      className="flex shrink-0 flex-col rounded-panel border border-line bg-surface"
      style={{ width: model.laneWidth, height: model.laneHeight, padding: LANE_PAD }}
      aria-label={`${lane.name}: ${lane.tickets.length} tickets`}
    >
      <div className="flex items-center px-1" style={{ height: LANE_HEADER_H, gap: 12 }}>
        <h2
          className="truncate font-heading font-bold uppercase tracking-[0.08em] text-ink-value"
          style={{ fontSize: lane.name.length > 22 ? 16 : lane.name.length > 16 ? 18 : 21 }}
          title={lane.name}
        >
          {lane.name}
        </h2>
        <span className="mono-badge shrink-0 bg-chip text-badge-fg" style={{ fontSize: 15, padding: "2px 10px" }}>
          {lane.tickets.length}
        </span>
        {pages > 1 ? (
          <span className="ml-auto shrink-0 font-mono text-[14px] text-label">
            {page + 1} / {pages}
          </span>
        ) : null}
      </div>
      <div key={page} className="anim-fade-in flex flex-1 flex-col overflow-hidden" style={{ gap: card.gap, marginTop: LANE_PAD }}>
        {visible.map((t) => (
          <CardView key={t.id} ticket={t} model={model} />
        ))}
      </div>
    </section>
  );
}

function CardView({ ticket, model }: { ticket: DisplayTicket; model: Model }) {
  const card = CARD[model.size];
  const category = ticket.category_id ? model.categories.get(ticket.category_id) : undefined;
  const tech = ticket.assigned_to_id ? model.people.get(ticket.assigned_to_id) : undefined;
  const isPaid = ticket.column_id === model.paidId;
  const days = daysSince(ticket.column_entered_at);
  const tier = agingTier(days);
  const badge = isPaid
    ? { text: "PAID", fg: "#6FDCA6", bg: "#0F2E1F" }
    : { text: `${days}d`, fg: tier?.fg ?? "#C3CAD9", bg: tier?.bg ?? "#1C222E" };
  const isToday = !isPaid && ticket.scheduled_date === todayDateOnly();
  const critical = !isPaid && days >= 60;

  return (
    <article
      className="flex shrink-0 flex-col overflow-hidden rounded-card border border-line-card bg-card"
      style={{
        height: card.h,
        padding: card.pad,
        gap: 4,
        borderLeft: `5px solid ${stripeFor(category?.color ?? "")}`,
        boxShadow: critical ? "inset 0 0 0 1px #B3261E" : undefined,
      }}
      aria-label={`${ticket.code}: ${ticket.title}, ${ticket.client}`}
    >
      <div className="flex items-center overflow-hidden" style={{ gap: 10 }}>
        <span className="shrink-0 font-mono font-medium tracking-[0.04em] text-label" style={{ fontSize: card.code }}>
          {ticket.code}
        </span>
        {tech ? (
          <span
            className="shrink-0 rounded-full border border-avatar-line bg-avatar-bg font-mono font-semibold text-ink-avatar"
            style={{ padding: "0 8px", lineHeight: "20px", fontSize: card.code - 3 }}
            title={`Tech: ${tech.name}`}
          >
            {tech.initials}
          </span>
        ) : null}
        {ticket.is_upgrade ? (
          <span className="chip shrink-0" style={{ background: "#332B0E", color: "#F5CE54", fontSize: 11 }}>
            {model.size === "compact" ? "UPG" : "UPGRADE"}
          </span>
        ) : null}
        <span
          className="mono-badge ml-auto shrink-0"
          style={{ color: badge.fg, background: badge.bg, fontSize: card.badge, fontWeight: 600, padding: "2px 10px" }}
          title={isPaid ? "Paid" : `${days} days in this column`}
        >
          {badge.text}
        </span>
      </div>
      <div className="flex items-start" style={{ gap: 10 }}>
        <span
          className={clsx("min-w-0 flex-1 font-semibold leading-tight text-ink-bright", card.twoLines ? "line-clamp-2" : "truncate")}
          style={{ fontSize: card.client }}
        >
          {ticket.client}
        </span>
        {isToday ? (
          <span className="chip shrink-0" style={{ background: "#15294D", color: "#8FB8FF", fontSize: 12, letterSpacing: "0.08em" }}>
            TODAY
          </span>
        ) : ticket.scheduled_date && !isPaid ? (
          <span className="shrink-0 font-mono text-ink-2" style={{ fontSize: card.code - 2 }} title="Scheduled">
            {formatDate(ticket.scheduled_date, false)}
          </span>
        ) : null}
      </div>
      <div
        className={clsx("leading-tight text-ink-2", card.twoLines ? "line-clamp-2" : "truncate")}
        style={{ fontSize: card.title }}
      >
        {ticket.title}
      </div>
    </article>
  );
}

function Footer({ model }: { model: Model }) {
  return (
    <footer
      className="flex items-center text-[14px] text-label"
      style={{ position: "absolute", left: PAD, right: PAD, bottom: PAD, height: FOOTER_H, gap: 24 }}
    >
      {model.empty.length > 0 ? (
        <div className="truncate">
          <span className="font-semibold uppercase tracking-[0.12em]">Nothing in</span>{" "}
          <span className="text-ink-2">{model.empty.map((l) => l.name).join("  ·  ")}</span>
        </div>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center" style={{ gap: 20 }}>
        {model.legend.map((c) => (
          <span key={c.id} className="flex items-center" style={{ gap: 8 }}>
            <span className="inline-block rounded-full" style={{ width: 12, height: 12, background: stripeFor(c.color) }} />
            <span>{c.name}</span>
          </span>
        ))}
      </div>
    </footer>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-[760px] rounded-panel border border-line-card border-t-2 border-t-accent bg-surface p-10 text-center">
        <div className="font-heading text-[28px] font-bold tracking-[0.06em] text-ink-bright">
          STARSOUND <span className="text-brand">OS</span>
        </div>
        <h1 className="mt-6 text-[34px] font-semibold text-ink-bright">{title}</h1>
        <p className="mt-4 text-[20px] leading-relaxed text-ink-2">{children}</p>
      </div>
    </div>
  );
}

function InvalidLink() {
  return (
    <Notice title="This display link isn't valid">
      The link may have been rotated. On the Service Board open <span className="text-ink-value">Settings → Lobby display</span>,
      copy the current link and update the TV with it.
    </Notice>
  );
}

function Connecting({ status }: { status: Status }) {
  return status === "reconnecting" ? (
    <Notice title="Can't reach the board right now">Checking the connection again every 15 seconds.</Notice>
  ) : (
    <Notice title="Connecting to the board…">The live view will appear in a moment.</Notice>
  );
}
