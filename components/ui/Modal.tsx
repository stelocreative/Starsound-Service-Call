"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "@/lib/clsx";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
  labelledBy?: string;
};

/**
 * Centered modal with a dim backdrop; closes on Escape or backdrop click.
 * Rendered into document.body so it escapes any ancestor stacking context
 * (the header is a flex child with a z-index, which would otherwise trap it).
 */
export function Modal({ open, onClose, title, children, width = 430, labelledBy }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.activeElement as HTMLElement | null;
    const first = panelRef.current?.querySelector<HTMLElement>("input, select, textarea, button");
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="anim-fade-in absolute inset-0 cursor-default bg-[rgba(3,5,10,0.65)]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : title}
        className={clsx(
          "anim-pop-in relative flex max-h-[92vh] w-full flex-col gap-3.5 overflow-y-auto rounded-[14px] border border-line-card border-t-2 border-t-accent bg-surface p-6 text-ink shadow-[0_18px_48px_rgba(0,0,0,0.55)]",
        )}
        style={{ maxWidth: width }}
      >
        {title ? (
          <h2 id={labelledBy} className="text-[18px] font-semibold text-ink-bright">
            {title}
          </h2>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
