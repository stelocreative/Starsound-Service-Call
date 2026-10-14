const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const STALE_DAYS = 6;
export const DAY_MS = 86_400_000;

/** Parse a YYYY-MM-DD date-only string as a local date (no timezone shift). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

export function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "Oct 12, 2026" (or "Oct 12" when `withYear` is false). */
export function formatDate(value: string | null | undefined, withYear = true): string {
  if (!value) return "";
  const date = value.length <= 10 ? parseDateOnly(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const base = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return withYear ? `${base}, ${date.getFullYear()}` : base;
}

/** "Oct 13, 2:40 PM" — adds the year when it is not the current year. */
export function formatDateTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  let hours = date.getHours();
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const year = date.getFullYear() === now.getFullYear() ? "" : `, ${date.getFullYear()}`;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}${year}, ${hours}:${minutes} ${suffix}`;
}

/** Whole days since a timestamp (never negative). */
export function daysSince(iso: string, now: number = Date.now()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY_MS));
}

/** Initials from a display name: "Mike Kowalski" -> "MK", "ryan" -> "RY". */
export function initialsFor(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Short type label for an attachment tile: "PDF", "JPG", "PNG", "FILE". */
export function fileKindLabel(fileName: string, mime?: string | null): string {
  const ext = fileName.includes(".") ? fileName.split(".").pop()! : "";
  if (ext && ext.length <= 4) return ext.toUpperCase();
  if (mime?.startsWith("image/")) return "IMG";
  if (mime === "application/pdf") return "PDF";
  return "FILE";
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Make a filename safe for a storage path. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\-() ]+/g, "_").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : "file";
}

export function joinNonEmpty(parts: (string | null | undefined)[], separator = " · "): string {
  return parts.map((p) => p?.trim()).filter(Boolean).join(separator);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
