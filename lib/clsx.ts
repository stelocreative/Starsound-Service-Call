type ClassValue = string | number | null | undefined | false | Record<string, boolean | null | undefined> | ClassValue[];

/** Tiny class name joiner (no dependency). */
export function clsx(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (typeof v === "string" || typeof v === "number") out.push(String(v));
    else if (Array.isArray(v)) {
      const inner = clsx(...v);
      if (inner) out.push(inner);
    } else for (const [k, on] of Object.entries(v)) if (on) out.push(k);
  }
  return out.join(" ");
}
