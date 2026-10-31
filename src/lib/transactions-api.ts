// SATU-SATUNYA file yang bicara dengan API. Kalau bentuk respons API kamu
// beda, cukup ubah file ini.
import { monthShort, shiftMonth, sum, type CashflowPoint, type Transaction, type TxType } from "./finance";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}
export const messageOf = (e: unknown) => (e instanceof Error ? e.message : "Terjadi kesalahan tak terduga");

export interface TxInput {
  type: TxType;
  amount: number;
  category: string;
  description: string | null;
  date: string; // ISO
}

interface RawTransaction extends Omit<Transaction, "amount"> {
  amount: string | number; // Prisma Decimal -> string di JSON
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    let message = `Permintaan gagal (${res.status})`;
    try {
      const j = (await res.json()) as { error?: unknown; message?: unknown };
      if (typeof j.error === "string") message = j.error;
      else if (typeof j.message === "string") message = j.message;
    } catch {
      /* body bukan JSON */
    }
    throw new ApiError(message, res.status);
  }
  const text = res.status === 204 ? "" : await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Terima { data }, { items }, { transactions }, atau body langsung. */
function unwrap(json: unknown): unknown {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const o = json as Record<string, unknown>;
    return o.data ?? o.items ?? o.transactions ?? o.transaction ?? json;
  }
  return json;
}
const normalize = (r: RawTransaction): Transaction => ({ ...r, amount: Number(r.amount) });

export async function listTransactions(month: string, signal?: AbortSignal) {
  const rows = unwrap(await request<unknown>(`/api/transactions?month=${encodeURIComponent(month)}`, { signal }));
  return (Array.isArray(rows) ? (rows as RawTransaction[]) : []).map(normalize);
}

export async function createTransaction(input: TxInput) {
  const json = await request<unknown>("/api/transactions", { method: "POST", body: JSON.stringify(input) });
  return normalize(unwrap(json) as RawTransaction);
}

export async function updateTransaction(id: string, input: Partial<TxInput>) {
  const json = await request<unknown>(`/api/transactions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return normalize(unwrap(json) as RawTransaction);
}

export async function deleteTransaction(id: string, opts: { keepalive?: boolean } = {}) {
  await request<void>(`/api/transactions/${encodeURIComponent(id)}`, { method: "DELETE", keepalive: opts.keepalive });
}

export async function listBudgets(month: string, signal?: AbortSignal): Promise<Record<string, number>> {
  const j = await request<{ data?: Array<{ category: string; limit: number | string }> }>(
    `/api/budgets?month=${encodeURIComponent(month)}`,
    { signal },
  );
  return Object.fromEntries((j.data ?? []).map((b) => [b.category, Number(b.limit)]));
}

export async function saveBudgets(month: string, items: Array<{ category: string; limit: number }>) {
  await request<unknown>("/api/budgets", { method: "PUT", body: JSON.stringify({ month, items }) });
}

/** N bulan terakhir (berakhir di endMonth) untuk CashflowChart. */
export async function loadCashflow(endMonth: string, count = 6, signal?: AbortSignal): Promise<CashflowPoint[]> {
  const keys = Array.from({ length: count }, (_, i) => shiftMonth(endMonth, i - (count - 1)));
  const lists = await Promise.all(keys.map((k) => listTransactions(k, signal)));
  return keys.map((key, i) => ({
    key,
    label: monthShort(key),
    income: sum(lists[i], "INCOME"),
    expense: sum(lists[i], "EXPENSE"),
  }));
}