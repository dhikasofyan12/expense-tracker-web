"use client";

import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import ui from "@/components/ui/ui.module.css";
import { cx } from "@/lib/cx";
import { categoryColor, EXPENSE_CATEGORIES, expenseByCategory, monthKey, monthLabel, rupiah, shiftMonth } from "@/lib/finance";
import { listBudgets, listTransactions, messageOf, saveBudgets } from "@/lib/transactions-api";
import s from "./budgets.module.css";

function LimitInput({ label, value, onCommit }: { label: string; value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const digits = draft ?? String(value || "");
  const shown = digits ? Number(digits).toLocaleString("id-ID") : "";

  function commit() {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(null);
      return;
    }
    if (draft === null) return;
    setDraft(null);
    onCommit(Number(draft) || 0);
  }

  return (
    <input
      className={cx(ui.input, s.limitInput)}
      inputMode="numeric"
      autoComplete="off"
      placeholder="Atur batas"
      aria-label={`Batas anggaran ${label}`}
      value={shown}
      onFocus={() => setDraft(String(value || ""))}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 12))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function Manager() {
  const { toast } = useToast();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const monthRef = useRef(month);
  useEffect(() => {
    monthRef.current = month;
  }, [month]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    Promise.all([listBudgets(month, controller.signal), listTransactions(month, controller.signal)])
      .then(([b, tx]) => {
        setBudgets(b);
        setSpent(Object.fromEntries(expenseByCategory(tx)));
        setStatus("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(messageOf(err));
        setStatus("error");
      });
    return () => controller.abort();
  }, [month, reload]);

  async function commit(category: string, limit: number) {
    const before = budgets[category] ?? 0;
    if (limit === before) return;
    const target = month;
    setBudgets((p) => ({ ...p, [category]: limit }));
    try {
      await saveBudgets(target, [{ category, limit }]);
      toast({ message: limit ? `Anggaran ${category} disimpan` : `Anggaran ${category} dihapus` });
    } catch (err) {
      if (monthRef.current === target) setBudgets((p) => ({ ...p, [category]: before }));
      toast({ tone: "error", message: `Gagal menyimpan: ${messageOf(err)}` });
    }
  }

  async function copyPrevious() {
    const target = month;
    const prevKey = shiftMonth(target, -1);
    try {
      const prev = await listBudgets(prevKey);
      const items = Object.entries(prev)
        .filter(([, limit]) => limit > 0)
        .map(([category, limit]) => ({ category, limit }));
      if (items.length === 0) {
        toast({ tone: "info", message: `${monthLabel(prevKey)} belum punya anggaran` });
        return;
      }
      await saveBudgets(target, items);
      if (monthRef.current === target) setBudgets((p) => ({ ...p, ...Object.fromEntries(items.map((i) => [i.category, i.limit])) }));
      toast({ message: `Anggaran disalin dari ${monthLabel(prevKey)}` });
    } catch (err) {
      toast({ tone: "error", message: `Gagal menyalin: ${messageOf(err)}` });
    }
  }

  const categories = [...new Set([...EXPENSE_CATEGORIES, ...Object.keys(budgets), ...Object.keys(spent)])];
  const budgeted = categories.filter((c) => (budgets[c] ?? 0) > 0);
  const totalLimit = budgeted.reduce((t, c) => t + budgets[c], 0);
  const totalSpent = budgeted.reduce((t, c) => t + (spent[c] ?? 0), 0);

  return (
    <section className={cx(ui.theme, s.page)}>
      <header className={s.header}>
        <div>
          <h1>Anggaran</h1>
          <p>Batas pengeluaran per kategori untuk {monthLabel(month)}. Kosongkan kolom untuk menghapus batas.</p>
        </div>
        <div className={s.monthNav}>
          <button type="button" className={ui.iconBtn} onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Bulan sebelumnya">
            <Icon name="left" size={16} />
          </button>
          <span aria-live="polite">{monthLabel(month)}</span>
          <button type="button" className={ui.iconBtn} onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Bulan berikutnya">
            <Icon name="right" size={16} />
          </button>
        </div>
      </header>

      {status === "loading" && (
        <div className={ui.card} aria-busy="true" aria-label="Memuat anggaran">
          {[0, 1, 2, 3].map((i) => <div key={i} className={ui.skeleton} />)}
        </div>
      )}

      {status === "error" && (
        <div className={ui.card}>
          <EmptyState
            title="Gagal memuat anggaran"
            description={error}
            action={<button type="button" className={cx(ui.btn, ui.btnGhost)} onClick={() => setReload((n) => n + 1)}>Coba lagi</button>}
          />
        </div>
      )}

      {status === "ready" && (
        <>
          <div className={cx(ui.card, s.total)}>
            <div>
              <p>Total terpakai dari anggaran</p>
              <strong>{rupiah(totalSpent)}</strong>
              <span> / {rupiah(totalLimit)}</span>
            </div>
            {budgeted.length === 0 && (
              <button type="button" className={cx(ui.btn, ui.btnGhost)} onClick={copyPrevious}>
                <Icon name="copy" size={16} />
                Salin dari bulan lalu
              </button>
            )}
          </div>

          <ul className={s.grid}>
            {categories.map((cat) => {
              const limit = budgets[cat] ?? 0;
              const used = spent[cat] ?? 0;
              const pct = limit ? (used / limit) * 100 : 0;
              const tone = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
              return (
                <li key={cat} className={ui.card}>
                  <div className={s.cardHead}>
                    <span className={s.cat}>
                      <i style={{ background: categoryColor(cat) }} aria-hidden="true" />
                      {cat}
                    </span>
                    {limit > 0 && (
                      <span className={cx(s.badge, s[tone])}>
                        {tone === "over" ? "Melebihi batas" : tone === "warn" ? "Hampir habis" : "Aman"} · {Math.round(pct)}%
                      </span>
                    )}
                  </div>
                  <div
                    className={s.track}
                    role="progressbar"
                    aria-label={`Pemakaian anggaran ${cat}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={limit ? Math.min(Math.round(pct), 100) : 0}
                  >
                    <div className={cx(s.fill, s[tone])} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className={s.cardFoot}>
                    <p>Terpakai <strong>{rupiah(used)}</strong></p>
                    <LimitInput key={`${month}:${cat}`} label={cat} value={limit} onCommit={(n) => commit(cat, n)} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export default function BudgetsManager() {
  return (
    <ToastProvider>
      <Manager />
    </ToastProvider>
  );
}