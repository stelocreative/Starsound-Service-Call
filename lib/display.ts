/** Lobby display: the view-only TV board at /display?key=… (see HANDOFF.md). */

export type DisplayTicket = {
  id: string;
  code: string;
  title: string;
  client: string;
  column_id: string;
  column_entered_at: string;
  category_id: string | null;
  assigned_to_id: string | null;
  owner_id: string | null;
  scheduled_date: string | null;
  is_upgrade: boolean;
};

/** What display_snapshot() returns: the board without contact details, notes or files. */
export type DisplaySnapshot = {
  generated_at: string;
  columns: { id: string; key: string; name: string; position: number }[];
  people: { id: string; name: string; initials: string }[];
  categories: { id: string; name: string; color: string }[];
  tickets: DisplayTicket[];
};

/** The TV asks for a fresh snapshot this often. */
export const DISPLAY_POLL_MS = 15_000;
/** A lane with more cards than fit turns its page this often. */
export const DISPLAY_PAGE_MS = 8_000;
/** The page reloads itself this often to pick up deploys (only while the connection is healthy). */
export const DISPLAY_RELOAD_MS = 6 * 60 * 60 * 1000;
/** The layout is designed at 1080p and scaled to the real screen. */
export const STAGE_W = 1920;
export const STAGE_H = 1080;

export function displayUrl(origin: string, key: string): string {
  return `${origin}/display?key=${encodeURIComponent(key)}`;
}
