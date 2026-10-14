"use client";

import { useRef, useState } from "react";
import { clsx } from "@/lib/clsx";

type Props = {
  value: string | null | undefined;
  onSave: (value: string | null) => void | boolean | Promise<boolean | void>;
  type?: "text" | "textarea" | "date" | "tel" | "email";
  placeholder?: string;
  /** Disallow saving an empty value (title, client). */
  required?: boolean;
  /** Format the stored value for display. */
  format?: (value: string) => string;
  ariaLabel: string;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  maxLength?: number;
};

/** Click-to-edit field. Enter/blur saves, Escape cancels. Empty optional values save as null. */
export function Editable({
  value,
  onSave,
  type = "text",
  placeholder = "Not set",
  required = false,
  format,
  ariaLabel,
  className,
  displayClassName,
  inputClassName,
  maxLength,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const cancelled = useRef(false);

  const startEditing = () => {
    setDraft(value ?? "");
    cancelled.current = false;
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const trimmed = draft.trim();
    const current = (value ?? "").trim();
    if (trimmed === current) return;
    if (required && trimmed === "") return;
    void onSave(trimmed === "" ? null : trimmed);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancelled.current = true;
      e.currentTarget.blur();
      return;
    }
    if (e.key === "Enter") {
      if (type === "textarea" && !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (type !== "date") e.currentTarget.select();
  };

  if (editing) {
    const common = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown,
      onFocus,
      autoFocus: true,
      "aria-label": ariaLabel,
      maxLength,
    };
    return type === "textarea" ? (
      <textarea rows={4} {...common} className={clsx("input min-h-[88px] resize-y", inputClassName)} />
    ) : (
      <input type={type} {...common} className={clsx("input", inputClassName)} />
    );
  }

  const hasValue = Boolean(value && value.trim() !== "");
  const shown = hasValue ? (format ? format(value as string) : (value as string)) : placeholder;

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label={`${ariaLabel}: ${hasValue ? shown : "not set"}. Click to edit`}
      title="Click to edit"
      className={clsx(
        "-mx-1.5 -my-0.5 block w-[calc(100%+12px)] rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-card",
        type === "textarea" && "whitespace-pre-wrap",
        className,
      )}
    >
      <span className={clsx(hasValue ? "text-ink-value" : "text-placeholder", displayClassName)}>{shown}</span>
    </button>
  );
}
