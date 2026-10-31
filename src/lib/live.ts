"use client";

import { useEffect, useRef, useState } from "react";

// Memanggil callback tiap intervalMs selama tab terlihat,
// dan sekali lagi saat tab kembali terlihat.
export function useAutoRefresh(callback: () => void, intervalMs = 15000) {
  const cb = useRef(callback);

  useEffect(() => {
    cb.current = callback;
  });

  useEffect(() => {
    function tick() {
      if (document.visibilityState === "visible") cb.current();
    }
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
}

// Waktu sekarang di client. null sebelum mount (aman untuk prerender).
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}