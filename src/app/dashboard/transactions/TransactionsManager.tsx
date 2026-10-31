"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import ui from "@/components/ui/ui.module.css";
import { cx } from "@/lib/cx";
import {
  categoryColor,
  formatDate,
  monthKey,
  monthLabel,
  rupiah,
  shiftMonth,
  sum,
  toCsv,
  type Transaction,
  type TxType,
} from "@/lib/finance";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  messageOf,
  updateTransaction,
  type TxInput,
} from "@/lib/transactions-api";
import s from "./manager.module.css";
import { TransactionForm } from "./TransactionForm";

const UNDO_MS = 6000;
type Filter = "ALL" | TxType;
type FormState = { mode: "create" } | { mode: "edit"; tx: Transaction } | null;

const monthOf = (tx: Transaction) => monthKey(new Date(tx.date));

function Row({ tx, onEdit, onDelete }: { tx: Transaction; onEdit: (t: Transaction) => void; onDelete: (t: Transaction) => void }) {
  const income = tx.type === "INCOME";
  const color = categoryColor(tx.category);
  const name = tx.description || tx.category;
  return (
    <li className={s.row}>
      <span className={s.dot} style={{ background: `${color}26`, color }} aria-hidden="true">
        <Icon name={income ? "arrowDown" : "arrowUp"} size={16} />
      </span>
      <div className={s.main}>
        <p className={s.title}>{name}</p>
        <p className={s.meta}>{tx.category} · {formatDate(tx.date)}</p>
      </div>
      <p className={cx(s.amount, income ? s.income : s.expense)}>
        <span className={ui.srOnly}>{income ? "Pemasukan " : "Pengeluaran "}</span>
        {income ? "+" : "−"}
        {rupiah(tx.amount)}
      </p>
      <div className={s.rowActions}>
        <button type="button" className={ui.iconBtn} onClick={() => onEdit(tx)} aria-label={`Edit ${name}`}>
          <Icon name="edit" size={16} />
        </button>
        <button type="button" className={cx(ui.iconBtn, ui.iconBtnDanger)} onClick={() => onDelete(tx)} aria-label={`Hapus ${name}`}>
          <Icon name="trash" size={16} />
        </button>
      </div>
    </li>
  );
}

function Manager() {
  const { toast } = useToast();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [items, setItems] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [form, setForm] = useState<FormState>(null);
  const [reload, setReload] = useState(0);

  const monthRef = useRef(month);
  useEffect(() => {
    monthRef.current = month;
  }, [month]);

  /** id -> timer penghapusan yang masih bisa diurungkan */
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    listTransactions(month, controller.signal)
      .then((rows) => {
        setItems(rows.filter((t) => !pending.current.has(t.id)));
        setStatus("ready");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(messageOf(err));
        setStatus("error");
      });
    return () => controller.abort();
  }, [month, reload]);

  // Hapus yang tertunda tetap dieksekusi saat halaman ditutup / pindah route.
  useEffect(() => {
    const map = pending.current;
    const flush = () => {
      map.forEach((timer, id) => {
        clearTimeout(timer);
        deleteTransaction(id, { keepalive: true }).catch(() => {});
      });
      map.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((t) => filter === "ALL" || t.type === filter)
      .filter((t) => !q || `${t.description ?? ""} ${t.category}`.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [items, query, filter]);

  const income = sum(visible, "INCOME");
  const expense = sum(visible, "EXPENSE");

  function remove(tx: Transaction) {
    setItems((prev) => prev.filter((t) => t.id !== tx.id));
    const restore = () => {
      if (monthOf(tx) === monthRef.current) setItems((prev) => [...prev, tx]);
    };
    const timer = setTimeout(async () => {
      pending.current.delete(tx.id);
      try {
        await deleteTransaction(tx.id);
      } catch (err) {
        restore();
        toast({ tone: "error", message: `Gagal menghapus: ${messageOf(err)}` });
      }
    }, UNDO_MS);
    pending.current.set(tx.id, timer);
    toast({
      message: "Transaksi dihapus",
      duration: UNDO_MS,
      action: {
        label: "Urungkan",
        onClick: () => {
          clearTimeout(timer);
          pending.current.delete(tx.id);
          restore();
        },
      },
    });
  }

  async function handleSubmit(input: TxInput) {
    if (form?.mode === "edit") {
      const saved = await updateTransaction(form.tx.id, input);
      const target = monthOf(saved);
      if (target === monthRef.current) {
        setItems((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
        toast({ message: "Perubahan disimpan" });
      } else {
        setItems((prev) => prev.filter((t) => t.id !== saved.id));
        toast({ message: `Transaksi dipindahkan ke ${monthLabel(target)}` });
      }
    } else {
      const saved = await createTransaction(input);
      const target = monthOf(saved);
      if (target === monthRef.current) setItems((prev) => [saved, ...prev]);
      else setMonth(target);
      toast({ message: input.type === "INCOME" ? "Pemasukan tersimpan" : "Pengeluaran tersimpan" });
    }
    setForm(null);
  }

  function exportCsv() {
    const blob = new Blob([toCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaksi-${month}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast({ message: `${visible.length} transaksi diekspor` });
  }

  const resetFilters = useCallback(() => {
    setQuery("");
    setFilter("ALL");
  }, []);

  const addButton = (
    <button type="button" className={cx(ui.btn, ui.btnPrimary)} onClick={() => setForm({ mode: "create" })}>
      <Icon name="plus" size={16} />
      Tambah transaksi
    </button>
  );

  return (
    <section className={cx(ui.theme, s.page)}>
      <header className={s.header}>
        <div>
          <h1>Riwayat transaksi</h1>
          <p>{status === "ready" ? `${items.length} transaksi di ${monthLabel(month)}` : monthLabel(month)}</p>
        </div>
        <div className={s.actions}>
          <button type="button" className={cx(ui.btn, ui.btnGhost)} onClick={exportCsv} disabled={visible.length === 0}>
            <Icon name="download" size={16} />
            Ekspor CSV
          </button>
          {addButton}
        </div>
      </header>

      <div className={s.toolbar}>
        <div className={s.monthNav}>
          <button type="button" className={ui.iconBtn} onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Bulan sebelumnya">
            <Icon name="left" size={16} />
          </button>
          <span aria-live="polite">{monthLabel(month)}</span>
          <button type="button" className={ui.iconBtn} onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Bulan berikutnya">
            <Icon name="right" size={16} />
          </button>
        </div>
        <div className={s.search}>
          <Icon name="search" size={16} />
          <input
            type="search"
            className={ui.input}
            placeholder="Cari catatan atau kategori"
            aria-label="Cari transaksi"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={ui.seg} role="radiogroup" aria-label="Filter jenis">
          {(
            [
              ["ALL", "Semua"],
              ["INCOME", "Masuk"],
              ["EXPENSE", "Keluar"],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="tx-filter" value={value} checked={filter === value} onChange={() => setFilter(value)} />
              <span className={ui.segNeutral}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={s.summary}>
        <div className={ui.card}><p>Pemasukan</p><strong className={s.income}>{rupiah(income)}</strong></div>
        <div className={ui.card}><p>Pengeluaran</p><strong className={s.expense}>{rupiah(expense)}</strong></div>
        <div className={ui.card}><p>Selisih</p><strong>{rupiah(income - expense)}</strong></div>
      </div>

      <div className={ui.card}>
        {status === "loading" && (
          <div aria-busy="true" aria-label="Memuat transaksi">
            {[0, 1, 2, 3].map((i) => <div key={i} className={ui.skeleton} />)}
          </div>
        )}
        {status === "error" && (
          <EmptyState
            title="Gagal memuat transaksi"
            description={error}
            action={<button type="button" className={cx(ui.btn, ui.btnGhost)} onClick={() => setReload((n) => n + 1)}>Coba lagi</button>}
          />
        )}
        {status === "ready" && items.length === 0 && (
          <EmptyState title="Belum ada transaksi" description={`Catat pemasukan atau pengeluaran pertamamu untuk ${monthLabel(month)}.`} action={addButton} />
        )}
        {status === "ready" && items.length > 0 && visible.length === 0 && (
          <EmptyState
            title="Tidak ada hasil"
            description="Tidak ada transaksi yang cocok dengan pencarian atau filter ini."
            action={<button type="button" className={cx(ui.btn, ui.btnGhost)} onClick={resetFilters}>Reset filter</button>}
          />
        )}
        {status === "ready" && visible.length > 0 && (
          <ul className={s.list}>
            {visible.map((tx) => (
              <Row key={tx.id} tx={tx} onEdit={(t) => setForm({ mode: "edit", tx: t })} onDelete={remove} />
            ))}
          </ul>
        )}
      </div>

      <Modal open={form !== null} onClose={() => setForm(null)} title={form?.mode === "edit" ? "Edit transaksi" : "Tambah transaksi"}>
        {form && (
          <TransactionForm
            key={form.mode === "edit" ? form.tx.id : "new"}
            initial={form.mode === "edit" ? form.tx : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setForm(null)}
          />
        )}
      </Modal>
    </section>
  );
}

export default function TransactionsManager() {
  return (
    <ToastProvider>
      <Manager />
    </ToastProvider>
  );
}