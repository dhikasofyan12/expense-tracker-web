// Tipe, format, dan agregasi murni (tanpa side effect) untuk fitur keuangan.

export type TxType = "INCOME" | "EXPENSE";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  description: string | null;
  date: string; // ISO string dari API
}

export interface CashflowPoint {
  key: string; // "2026-10"
  label: string; // "Okt"
  income: number;
  expense: number;
}

export const EXPENSE_CATEGORIES = ["Makan", "Transportasi", "Hiburan", "Belanja", "Tagihan", "Lainnya"];
export const INCOME_CATEGORIES = ["Uang saku", "Gaji", "Freelance", "Lainnya"];
export const categoriesFor = (type: TxType) => (type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES);

const PALETTE: Record<string, string> = {
  Makan: "#fbbf24",
  Transportasi: "#7dd3fc",
  Hiburan: "#a78bfa",
  Belanja: "#fb7185",
  Tagihan: "#6ee7b7",
  "Uang saku": "#6ee7b7",
  Gaji: "#34d399",
  Freelance: "#7dd3fc",
};
export const categoryColor = (category: string) => PALETTE[category] ?? "#a1a1aa";

/* ---------- Format ---------- */

const rupiahFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const rupiah = (n: number) => rupiahFmt.format(n).replace(/\u00a0/g, " ");

const trimNum = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 1 });
export function compactRupiah(n: number) {
  if (n >= 1e9) return `${trimNum(n / 1e9)} M`;
  if (n >= 1e6) return `${trimNum(n / 1e6)} jt`;
  if (n >= 1e3) return `${trimNum(n / 1e3)} rb`;
  return String(n);
}

const pad = (n: number) => String(n).padStart(2, "0");

export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function monthShort(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "short" });
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });


/** Nilai untuk <input type="date">. Dari API: ambil tanggalnya langsung. Tanpa argumen: hari ini (lokal). */
export function toDateInput(iso?: string) {
  if (iso) return iso.slice(0, 10);
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * yyyy-mm-dd -> ISO pukul 12:00 UTC. Jam siang dipilih supaya tanggal tidak
 * bergeser ke bulan lain saat server memfilter bulan memakai UTC.
 */
/**
 * Nilai <input type="date"> sudah berformat yyyy-mm-dd, dan itu yang diminta
 * validasi server. Server sendiri menyimpannya sebagai 00:00 UTC (toDbDate).
 */
export const dateInputToIso = (value: string) => value;

/* ---------- Agregasi ---------- */

export const sum = (rows: Transaction[], type: TxType) =>
  rows.reduce((total, t) => (t.type === type ? total + t.amount : total), 0);

export function expenseByCategory(rows: Transaction[]): Array<[string, number]> {
  const totals = new Map<string, number>();
  for (const t of rows) if (t.type === "EXPENSE") totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

/** Tick sumbu Y yang "rapi" (1, 2, 2.5, 5 x 10^n). */
export function niceTicks(max: number, count = 4) {
  if (max <= 0) return { ticks: [0, 25_000, 50_000, 75_000, 100_000], top: 100_000 };
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
  return { ticks: Array.from({ length: count + 1 }, (_, i) => i * step), top: step * count };
}

/* ---------- CSV ---------- */

/** CSV aman untuk Excel: BOM UTF-8 + penangkal formula injection (=, +, -, @). */
export function toCsv(rows: Transaction[]) {
  const cell = (v: string | number) => {
    let s = String(v);
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines: Array<Array<string | number>> = [
    ["Tanggal", "Jenis", "Kategori", "Deskripsi", "Nominal"],
    ...rows.map((t) => [
      toDateInput(t.date),
      t.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
      t.category,
      t.description ?? "",
      t.amount,
    ]),
  ];
  return "\uFEFF" + lines.map((r) => r.map(cell).join(",")).join("\r\n");
}