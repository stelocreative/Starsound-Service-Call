"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { clsx } from "@/lib/clsx";

type ToastKind = "info" | "error" | "success";
type Toast = { id: number; message: string; kind: ToastKind };

type ToastApi = {
  show: (message: string, kind?: ToastKind) => void;
  error: (message: string) => void;
  success: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, kind }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      error: (m) => show(m, "error"),
      success: (m) => show(m, "success"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={clsx(
              "anim-pop-in pointer-events-auto max-w-[520px] rounded-lg border px-3.5 py-2.5 text-[13px] shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
              t.kind === "error" && "border-[#5a2222] bg-danger-bg text-danger",
              t.kind === "success" && "border-[#1f4d36] bg-paid-bg text-paid-fg",
              t.kind === "info" && "border-line-input bg-card text-ink-3",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
