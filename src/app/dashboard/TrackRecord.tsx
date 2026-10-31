"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatBulanTahun,
  formatJam,
  formatRupiah,
  savingsRate,
} from "@/lib/format";
import { useAutoRefresh, useNow } from "@/lib/live";
import styles from "./trackrecord.module.css";

type History = {
  year: number;
  months: { month: string; income: number; expense: number }[];
  yearIncome: number;
  yearExpense: number;
  allTime: { income: number; expense: number; balance: number; count: number };
  firstYear: number | null;
  lastYear: number | null;
};

const LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

type Props = {
  selectedMonth: string;
  onPickMonth: (month: string) => void;
  refreshKey?: number;
};

export default function TrackRecord({ selectedMonth, onPickMonth, refreshKey = 0 }: Props) {
  const now = useNow(30000);
  const nowYear = now ? now.getFullYear() : 0;
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const year = pickedYear ?? nowYear;

  const [data, setData] = useState<History | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (y: number, silent: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/history?year=${y}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const err = body?.error;
        throw new Error(
          typeof err === "string"
            ? err
            : err?.message ?? "Gagal memuat track record."
        );
      }
      const body: History = await res.json();
      setData(body);
      setError("");
      setUpdatedAt(new Date());
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      if (!silent) setError((err as Error).message || "Gagal memuat track record.");
    }
  }, []);

   useEffect(() => {
    if (year > 0) load(year, false);
    return () => abortRef.current?.abort();
  }, [year, load, refreshKey]);

  useAutoRefresh(() => {
    if (year > 0) load(year, true);
  });

  if (!year) return <p className={styles.muted}>Memuat…</p>;

  const first = data?.firstYear ?? nowYear;
  const last = data?.lastYear ?? nowYear;
  const startYear = Math.min(first, nowYear, year);
  const endYear = Math.max(last, nowYear, year);
  const years: number[] = [];
  for (let y = endYear; y >= startYear; y--) years.push(y);

  const max = data
    ? Math.max(1, ...data.months.flatMap((m) => [m.income, m.expense]))
    : 1;
  const stale = data !== null && data.year !== year;
  const yearRate = data ? savingsRate(data.yearIncome, data.yearExpense) : null;

  return (
    <section className={styles.section} aria-label="Track record">
      <div className={styles.head}>
        <h2 className={styles.title}>Track record</h2>
        <div className={styles.headTools}>
          {pickedYear !== null && (
            <button
              type="button"
              className={styles.btnSmall}
              onClick={() => setPickedYear(null)}
            >
              Tahun ini
            </button>
          )}
          <label className={styles.yearLabel}>
            Tahun
            <select
              className={styles.select}
              value={year}
              onChange={(e) => setPickedYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {!data ? (
        !error && <p className={styles.muted}>Memuat…</p>
      ) : (
        <div className={stale ? styles.busy : undefined} aria-busy={stale}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                Total disimpan semua waktu
              </span>
              <strong
                className={`${styles.statValue} ${
                  data.allTime.balance < 0 ? styles.expense : ""
                }`}
              >
                {formatRupiah(data.allTime.balance)}
              </strong>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Total pemasukan</span>
              <strong className={`${styles.statValue} ${styles.income}`}>
                {formatRupiah(data.allTime.income)}
              </strong>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>
                Total pengeluaran ({data.allTime.count} transaksi)
              </span>
              <strong className={`${styles.statValue} ${styles.expense}`}>
                {formatRupiah(data.allTime.expense)}
              </strong>
            </div>
          </div>

          <div className={styles.chart} aria-hidden="true">
            {data.months.map((m, i) => (
              <div key={m.month} className={styles.col}>
                <div className={styles.bars}>
                  <div
                    className={styles.barIncome}
                    style={{ height: `${(m.income / max) * 100}%` }}
                    title={`Pemasukan ${formatRupiah(m.income)}`}
                  />
                  <div
                    className={styles.barExpense}
                    style={{ height: `${(m.expense / max) * 100}%` }}
                    title={`Pengeluaran ${formatRupiah(m.expense)}`}
                  />
                </div>
                <span className={styles.barLabel}>{LABELS[i]}</span>
              </div>
            ))}
          </div>
          <p className={styles.key}>
            <span className={styles.income}>■ Pemasukan</span>{" "}
            <span className={styles.expense}>■ Pengeluaran</span>
          </p>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th className={styles.num}>Pemasukan</th>
                  <th className={styles.num}>Pengeluaran</th>
                  <th className={styles.num}>Disimpan</th>
                  <th className={styles.num}>%</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m, i) => {
                  const empty = m.income === 0 && m.expense === 0;
                  const diff = m.income - m.expense;
                  const rate = savingsRate(m.income, m.expense);
                  const selected = m.month === selectedMonth;
                  return (
                    <tr
                      key={m.month}
                      className={selected ? styles.rowSelected : undefined}
                    >
                      <td>
                        <button
                          type="button"
                          className={styles.monthBtn}
                          onClick={() => onPickMonth(m.month)}
                          aria-label={`Lihat ringkasan ${formatBulanTahun(m.month)}`}
                          aria-current={selected ? "true" : undefined}
                        >
                          {LABELS[i]}
                        </button>
                      </td>
                      {empty ? (
                        <td colSpan={4} className={styles.muted}>
                          Belum ada transaksi
                        </td>
                      ) : (
                        <>
                          <td className={`${styles.num} ${styles.income}`}>
                            {formatRupiah(m.income)}
                          </td>
                          <td className={`${styles.num} ${styles.expense}`}>
                            {formatRupiah(m.expense)}
                          </td>
                          <td
                            className={`${styles.num} ${
                              diff < 0 ? styles.expense : styles.income
                            }`}
                          >
                            {formatRupiah(diff)}
                          </td>
                          <td className={`${styles.num} ${styles.muted}`}>
                            {rate === null ? "—" : `${rate}%`}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total {data.year}</th>
                  <td className={`${styles.num} ${styles.income}`}>
                    {formatRupiah(data.yearIncome)}
                  </td>
                  <td className={`${styles.num} ${styles.expense}`}>
                    {formatRupiah(data.yearExpense)}
                  </td>
                  <td
                    className={`${styles.num} ${
                      data.yearIncome - data.yearExpense < 0
                        ? styles.expense
                        : styles.income
                    }`}
                  >
                    {formatRupiah(data.yearIncome - data.yearExpense)}
                  </td>
                  <td className={`${styles.num} ${styles.muted}`}>
                    {yearRate === null ? "—" : `${yearRate}%`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {updatedAt && (
            <p className={styles.updated}>
              Diperbarui otomatis tiap 15 detik. Terakhir: {formatJam(updatedAt)}
            </p>
          )}
        </div>
      )}
    </section>
  );
}