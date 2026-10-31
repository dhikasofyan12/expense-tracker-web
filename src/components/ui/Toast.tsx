"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import ui from "./ui.module.css";

type Tone = "success" | "error" | "info";
interface ToastAction {
  label: string;
  onClick: () => void;
}
interface ToastInput {
  message: string;
  tone?: Tone;
  action?: ToastAction;
  duration?: number;
}
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
  action?: ToastAction;
}
interface ToastApi {
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-3), { id, message: input.message, tone: input.tone ?? "success", action: input.action }]);
      timers.current.set(id, setTimeout(() => dismiss(id), input.duration ?? 4000));
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={`${ui.theme} ${ui.toastViewport}`} role="region" aria-label="Notifikasi">
        {items.map((t) => (
          <div key={t.id} className={`${ui.toast} ${ui[t.tone]}`} role={t.tone === "error" ? "alert" : "status"}>
            <span className={ui.toastIcon}>
              <Icon name={t.tone === "error" ? "alert" : "check"} size={16} />
            </span>
            <p>{t.message}</p>
            {t.action && (
              <button
                type="button"
                className={ui.toastAction}
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button type="button" className={ui.toastClose} aria-label="Tutup notifikasi" onClick={() => dismiss(t.id)}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}