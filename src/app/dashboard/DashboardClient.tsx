"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatRupiah, formatTanggal, monthKey, savingsRate } from "@/lib/format";
import { useAutoRefresh, useNow } from "@/lib/live";
import LiveClock from "./LiveClock";
import TrackRecord from "./TrackRecord";
import SavingsAdvice from "./SavingsAdvice";
import s from "./dashboardbento.module.css";
import ui from "@/components/ui/ui.module.css";
import { CashflowChart } from "@/components/ui/charts/CashFlowChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import { categoryColor, compactRupiah, monthLabel, type CashflowPoint } from "@/lib/finance";
import { createTransaction, loadCashflow } from "@/lib/transactions-api";
import { TransactionForm } from "./transactions/TransactionForm";

type Summary = {
  month: string;
  income: number;
  expense: number;
  balance: number;
  topCategories: { category: string; total: number }[];
  recentExpenses: {
    id: string;
    category: string;
    description: string | null;
    date: string;
    amount: number;
  }[];
};

const R = 42;
const C = 2 * Math.PI * R;
const GAP = 1.2;

function Donut({ data }: { data: Summary }) {
  const rest = Math.max(0, data.expense - data.topCategories.reduce((t, c) => t + c.total, 0));
  const parts = [
    ...data.topCategories.map((c) => ({ name: c.category, value: c.total })),
    ...(rest > 0 ? [{ name: "Lainnya", value: rest }] : []),
  ];
  const arcs = parts.map((p, i) => {
    const len = (p.value / data.expense) * C;
    const start = parts.slice(0, i).reduce((t, q) => t + (q.value / data.expense) * C, 0);
    return { ...p, len, start, draw: parts.length > 1 ? Math.max(0, len - GAP) : len, color: categoryColor(p.name) };
  });

  return (
    <div className={s.donutWrap}>
      <svg viewBox="0 0 100 100" className={s.donut} role="img" aria-label="Komposisi pengeluaran per kategori">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
        {arcs.map((a) => (
          <circle
            key={a.name}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={a.color}
            strokeWidth="9"
            strokeDasharray={`${a.draw} ${C - a.draw}`}
            strokeDashoffset={-a.start}
            transform="rotate(-90 50 50)"
          />
        ))}
        <text x="50" y="47" textAnchor="middle" className={s.donutLabel}>Total</text>
        <text x="50" y="58" textAnchor="middle" className={s.donutValue}>Rp {compactRupiah(data.expense)}</text>
      </svg>
      <ul className={s.legend}>
        {arcs.map((a) => (
          <li key={a.name} className={s.legendRow}>
            <i style={{ background: a.color }} aria-hidden="true" />
            <span>{a.name}</span>
            <span>{Math.round((a.value / data.expense) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Dashboard() {
  const { toast } = useToast();
  const now = useNow(30000);
  const nowMonth = now ? monthKey(now) : "";
  const [pickedMonth, setPickedMonth] = useState<string | null>(null);
  const month = pickedMonth ?? nowMonth;

  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [flow, setFlow] = useState<CashflowPoint[] | null>(null);
  const [flowError, setFlowError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (m: string, silent: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await fetch(`/api/summary?month=${m}`, { signal: controller.signal });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const err = body?.error;
        throw new Error(typeof err === "string" ? err : err?.message ?? "Gagal memuat ringkasan.");
      }
      const body: Summary = await res.json();
      setData(body);
      setError("");
      setLoading(false);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      if (!silent) setError((err as Error).message || "Gagal memuat ringkasan.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!month) return;
    load(month, false);
    return () => abortRef.current?.abort();
  }, [month, load]);

  useAutoRefresh(() => {
    if (month) load(month, true);
  });

  // Grafik arus kas 6 bulan (berakhir di bulan yang dipilih)
  useEffect(() => {
    if (!month) return;
    const controller = new AbortController();
    loadCashflow(month, 6, controller.signal)
      .then((points) => {
        setFlow(points);
        setFlowError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFlowError(true);
      });
    return () => controller.abort();
  }, [month, refreshKey]);

  const rate = data ? savingsRate(data.income, data.expense) : null;
  const rateWidth = rate === null ? 0 : Math.max(0, Math.min(100, rate));
  const max = data?.topCategories[0]?.total ?? 0;

  function pickFromTable(m: string) {
    setPickedMonth(m);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSaved() {
    setAdding(false);
    if (month) load(month, true);
    setRefreshKey((k) => k + 1);
    toast({ message: "Transaksi tersimpan" });
  }

  const heroHint =
    !data
      ? ""
      : data.income === 0 && data.expense === 0
        ? "Belum ada transaksi di bulan ini"
        : rate === null
          ? "Belum ada pemasukan, jadi persen belum bisa dihitung"
          : data.balance >= 0
            ? `${rate}% dari pemasukan berhasil disimpan`
            : `Pengeluaran melebihi pemasukan (${rate}%)`;

  return (
    <section className={cx(ui.theme, s.page)}>
      <header className={s.header}>
        <LiveClock />
        <div className={s.toolbar}>
          <label className={s.monthField}>
            <input
              className={ui.input}
              type="month"
              aria-label="Pilih bulan"
              value={month}
              onChange={(e) => e.target.value && setPickedMonth(e.target.value)}
            />
          </label>
          {pickedMonth !== null && (
            <button type="button" className={cx(ui.btn, ui.btnGhost)} onClick={() => setPickedMonth(null)}>
              Bulan ini
            </button>
          )}
          <Link href="/dashboard/transactions" className={s.link}>
            Lihat riwayat →
          </Link>
          <button type="button" className={cx(ui.btn, ui.btnPrimary)} onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} />
            Tambah transaksi
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className={cx(ui.formError, s.errorBox)}>
          <span>{error}</span>
          <button type="button" className={cx(ui.btn, ui.btnGhost)} onClick={() => month && load(month, false)}>
            Coba lagi
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className={s.grid} aria-busy="true" aria-label="Memuat ringkasan">
          <div className={cx(ui.skeleton, s.sk1)} />
          <div className={cx(ui.skeleton, s.sk2)} />
          <div className={cx(ui.skeleton, s.sk3)} />
          <div className={cx(ui.skeleton, s.sk3)} />
        </div>
      ) : data ? (
        <div className={s.grid} aria-busy={loading}>
          <section className={cx(ui.card, s.hero)}>
            <p className={s.label}>Disimpan bulan ini</p>
            <p className={cx(s.heroValue, data.balance < 0 && s.neg)}>{formatRupiah(data.balance)}</p>
            {rate !== null && (
              <div
                className={s.rateTrack}
                role="progressbar"
                aria-label="Persentase pemasukan yang disimpan"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={rateWidth}
              >
                <div className={cx(s.rateFill, data.balance < 0 && s.rateNeg)} style={{ width: `${rateWidth}%` }} />
              </div>
            )}
            <p className={s.hint}>{heroHint}</p>
          </section>

          <div className={s.stats}>
            <div className={cx(ui.card, s.stat)}>
              <p className={s.label}>Pemasukan</p>
              <p className={cx(s.statValue, s.income)}>{formatRupiah(data.income)}</p>
            </div>
            <div className={cx(ui.card, s.stat)}>
              <p className={s.label}>Pengeluaran</p>
              <p className={cx(s.statValue, s.expense)}>{formatRupiah(data.expense)}</p>
            </div>
          </div>

          <section className={cx(ui.card, s.colDonut)}>
            <h2 className={s.cardTitle}>Komposisi pengeluaran</h2>
            {data.expense === 0 ? (
              <EmptyState title="Belum ada pengeluaran" description="Komposisi muncul setelah kamu mencatat pengeluaran bulan ini." />
            ) : (
              <Donut data={data} />
            )}
          </section>

          <section className={cx(ui.card, s.colFlow)}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Arus kas 6 bulan</h2>
              <span>s.d. {monthLabel(month)}</span>
            </div>
            {flowError ? (
              <EmptyState title="Grafik belum bisa dimuat" description="Data arus kas gagal diambil. Coba muat ulang halaman." />
            ) : flow === null ? (
              <div className={ui.skeleton} style={{ height: 200 }} aria-busy="true" />
            ) : flow.every((p) => p.income === 0 && p.expense === 0) ? (
              <EmptyState title="Belum ada arus kas" description="Grafik muncul setelah ada transaksi dalam 6 bulan terakhir." />
            ) : (
              <CashflowChart data={flow} />
            )}
          </section>

          <section className={cx(ui.card, s.colRecent)}>
            <h2 className={s.cardTitle}>Pengeluaran terakhir</h2>
            {data.recentExpenses.length === 0 ? (
              <EmptyState
                title="Belum ada pengeluaran"
                description="Pengeluaran yang kamu catat bulan ini akan tampil di sini."
                action={
                  <button type="button" className={cx(ui.btn, ui.btnPrimary)} onClick={() => setAdding(true)}>
                    <Icon name="plus" size={16} />
                    Tambah transaksi
                  </button>
                }
              />
            ) : (
              <ul className={s.recent}>
                {data.recentExpenses.map((r) => {
                  const color = categoryColor(r.category);
                  return (
                    <li key={r.id} className={s.recentRow}>
                      <span className={s.dot} style={{ background: `${color}26`, color }} aria-hidden="true">
                        <Icon name="arrowUp" size={16} />
                      </span>
                      <div className={s.recentMain}>
                        <p className={s.recentTitle}>{r.description || r.category}</p>
                        <p className={s.recentMeta}>
                          {r.category} · {formatTanggal(r.date)}
                        </p>
                      </div>
                      <p className={s.recentAmount}>− {formatRupiah(r.amount)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={cx(ui.card, s.colTop)}>
            <h2 className={s.cardTitle}>Pengeluaran terbesar</h2>
            {data.topCategories.length === 0 ? (
              <EmptyState title="Belum ada data" description="Kategori terbesar muncul setelah ada pengeluaran." />
            ) : (
              <ul className={s.bars}>
                {data.topCategories.map((c) => (
                  <li key={c.category}>
                    <div className={s.barHead}>
                      <span>{c.category}</span>
                      <span>{formatRupiah(c.total)}</span>
                    </div>
                    <div className={s.track}>
                      <div
                        className={s.fill}
                        style={{ width: `${max > 0 ? (c.total / max) * 100 : 0}%`, background: categoryColor(c.category) }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      <div className={s.more}>
        <TrackRecord selectedMonth={month} onPickMonth={pickFromTable} refreshKey={refreshKey} />
        <SavingsAdvice month={month} refreshKey={refreshKey} />
      </div>

      {adding && (
        <Modal open onClose={() => setAdding(false)} title="Tambah transaksi">
          <TransactionForm
            onSubmit={async (input) => {
              await createTransaction(input);
              handleSaved();
            }}
            onCancel={() => setAdding(false)}
          />
        </Modal>
      )}
    </section>
  );
}

export default function DashboardClient() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}