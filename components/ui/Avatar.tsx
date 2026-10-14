import { clsx } from "@/lib/clsx";

type Props = {
  initials?: string | null;
  kind: "tech" | "owner" | "user" | "note";
  size?: number;
  title?: string;
  className?: string;
};

/**
 * tech: solid light circle (the person doing the work)
 * owner: outlined circle (whoever the ball is in front of)
 * user: header avatar; note: note author (same look as tech)
 */
export function Avatar({ initials, kind, size = 22, title, className }: Props) {
  const style = { width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.45)) };
  if (!initials) {
    return (
      <span
        title={title ?? "Unassigned"}
        aria-label={title ?? "Unassigned"}
        className={clsx(
          "inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-line-dashed text-placeholder",
          className,
        )}
        style={style}
      >
        +
      </span>
    );
  }
  return (
    <span
      title={title}
      aria-label={title}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full leading-none",
        kind === "tech" || kind === "note" ? "bg-ink font-bold text-app" : null,
        kind === "owner" ? "border-[1.5px] border-line-avatar bg-card font-semibold text-ink-avatar" : null,
        kind === "user" ? "border border-avatar-line bg-avatar-bg font-semibold text-ink-3" : null,
        className,
      )}
      style={style}
    >
      {initials}
    </span>
  );
}
