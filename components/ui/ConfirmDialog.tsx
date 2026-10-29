"use client";

import { useState } from "react";
import { Modal } from "./Modal";

type Props = {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

const noop = () => undefined;

/** Danger confirmation. Cancel is the first control so it takes focus; Escape and the backdrop cancel. */
export function ConfirmDialog({ open, title, message, confirmLabel, busyLabel = "Working…", onConfirm, onCancel }: Props) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={busy ? noop : onCancel} title={title} labelledBy="confirm-dialog-title" width={420}>
      <div className="text-[13.5px] leading-relaxed text-ink-3">{message}</div>
      <div className="mt-1 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="btn btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={() => void confirm()} disabled={busy} className="btn btn-danger">
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
