"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatRupiah } from "@/lib/format";
import { useAutoRefresh } from "@/lib/live";
import styles from "./savings.module.css";

type Data = {
  month: string;
  income: number;
  expense: number;
  avgExpense: number;
  monthsUsed: number;
  basis: "previous" | "current" | "none";
  saved: number;
};

type Props = { month: string; refreshKey?: number };

function pct(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
}

export default function SavingsAdvice({ month, refreshKey = 0 }: Props) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (m: string, silent: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/savings?month=${m}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const err = body?.error;
        throw new Error(
          typeof err === "string" ? err : err?.message ?? "Gagal memuat saran."
        );
      }
      setData(await res.json());
      setError("");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      if (!silent) setError((err as Error).message || "Gagal memuat saran.");
    }
  }, []);

  useEffect(() => {
    if (month) load(month, false);
    return () => abortRef.current?.abort();
  }, [month, load, refreshKey]);

  useAutoRefresh(() => {
    if (month) load(month, true);
  });

  if (error) {
    return (
      <section className={styles.section}>
        <p className={styles.error} role="alert">
          {error}
        </p>
      </section>
    );
  }
  if (!data) return null;

  const saved = Math.max(0, data.saved);
  const target3 = data.avgExpense * 3;
  const target6 = data.avgExpense * 6;
  const ruleAmount = Math.round(data.income * 0.2);
  const left = data.income - data.expense;
  const remaining3 = Math.max(0, target3 - saved);
  const perMonth = Math.ceil(remaining3 / 12);

  return (
    <section className={styles.section} aria-label="Saran tabungan">
      <h2 className={styles.title}>Saran tabungan dan dana darurat</h2>

      {data.avgExpense === 0 ? (
        <p className={styles.muted}>
          Belum cukup data pengeluaran untuk menghitung target dana darurat.
          Catat beberapa pengeluaran dulu.
        </p>
      ) : (
        <>
          <p className={styles.muted}>
            Rata-rata pengeluaran {formatRupiah(data.avgExpense)} per bulan
            {data.basis === "previous"
              ? ` (dari ${data.monthsUsed} bulan sebelumnya).`
              : " (dari bulan ini saja, jadi masih kasar)."}
          </p>

          <div className={styles.goal}>
            <div className={styles.goalHead}>
              <span>Dana darurat minimum (3 bulan)</span>
              <span>{formatRupiah(target3)}</span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: `${pct(saved, target3)}%` }}
              />
            </div>
            <span className={styles.note}>
              Tercatat disimpan {formatRupiah(saved)} ({Math.round(pct(saved, target3))}%)
            </span>
          </div>

          <div className={styles.goal}>
            <div className={styles.goalHead}>
              <span>Dana darurat ideal (6 bulan)</span>
              <span>{formatRupiah(target6)}</span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: `${pct(saved, target6)}%` }}
              />
            </div>
            <span className={styles.note}>
              {Math.round(pct(saved, target6))}% tercapai
            </span>
          </div>

          <p className={styles.tip}>
            {remaining3 === 0
              ? "Target minimum 3 bulan sudah tercapai berdasarkan catatanmu."
              : `Untuk mencapai target 3 bulan dalam 12 bulan, sisihkan sekitar ${formatRupiah(
                  perMonth
                )} per bulan.`}
          </p>
        </>
      )}

      <div className={styles.rule}>
        {data.income <= 0 ? (
          <p className={styles.muted}>
            Belum ada pemasukan di bulan ini, jadi saran 20% belum bisa dihitung.
          </p>
        ) : (
          <p className={styles.tip}>
            Patokan umum: sisihkan 20% pemasukan, yaitu {formatRupiah(ruleAmount)} bulan
            ini. Yang tersisa saat ini {formatRupiah(Math.max(0, left))}
            {left >= ruleAmount
              ? ", sudah memenuhi patokan."
              : left > 0
              ? `, masih kurang ${formatRupiah(ruleAmount - left)}.`
              : ", pengeluaran sudah melebihi pemasukan."}
          </p>
        )}
      </div>

      <p className={styles.disclaimer}>
        Panduan umum dari datamu, bukan nasihat keuangan. Angka "disimpan" adalah
        pemasukan dikurangi pengeluaran yang kamu catat, bukan saldo rekening.
      </p>
    </section>
  );
}   