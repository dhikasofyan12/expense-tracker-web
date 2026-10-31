"use client";

import { useNow } from "@/lib/live";
import { formatHariLengkap, formatJam } from "@/lib/format";
import styles from "./trackrecord.module.css";

export default function LiveClock() {
  const now = useNow(1000);
  return (
    <p className={styles.clock}>
      {now ? `${formatHariLengkap(now)} · ${formatJam(now)}` : "\u00A0"}
    </p>
  );
}