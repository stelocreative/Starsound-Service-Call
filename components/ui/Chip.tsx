import type { Category } from "@/lib/types";
import { categoryStyle } from "@/lib/categories";
import { clsx } from "@/lib/clsx";

export function Chip({
  children,
  fg,
  bg,
  className,
  title,
}: {
  children: React.ReactNode;
  fg: string;
  bg: string;
  className?: string;
  title?: string;
}) {
  return (
    <span className={clsx("chip", className)} style={{ color: fg, background: bg }} title={title}>
      {children}
    </span>
  );
}

export function CategoryChip({ category, className }: { category: Category | null | undefined; className?: string }) {
  const style = categoryStyle(category);
  return (
    <Chip fg={style.chipFg} bg={style.chipBg} className={className}>
      {category?.name ?? "Uncategorized"}
    </Chip>
  );
}

export function UpgradeBadge({ className }: { className?: string }) {
  return (
    <span
      className={clsx("chip bg-ink text-app", className)}
      style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", padding: "2px 8px" }}
      title="Replacement / upgrade"
    >
      UPGRADE
    </span>
  );
}
