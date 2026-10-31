"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import ui from "@/components/ui/ui.module.css";
import { cx } from "@/lib/cx";
import { categoriesFor, dateInputToIso, toDateInput, type Transaction, type TxType } from "@/lib/finance";
import { messageOf, type TxInput } from "@/lib/transactions-api";

type Errors = Partial<Record<"amount" | "date" | "description", string>>;

export function TransactionForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Transaction;
  onSubmit: (input: TxInput) => Promise<void>;
  onCancel: () => void;
}) {
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TxType>(initial?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(initial ? String(Math.round(initial.amount)) : "");
  const [category, setCategory] = useState(initial?.category ?? categoriesFor(initial?.type ?? "EXPENSE")[0]);
  const [date, setDate] = useState(toDateInput(initial?.date));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const base = categoriesFor(type);
  const options = base.includes(category) ? base : [category, ...base];

  function changeType(next: TxType) {
    setType(next);
    if (!categoriesFor(next).includes(category)) setCategory(categoriesFor(next)[0]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    const next: Errors = {};
    if (!amount || !Number.isFinite(value) || value <= 0) next.amount = "Nominal harus lebih dari 0";
    if (!date) next.date = "Tanggal wajib diisi";
    if (description.length > 100) next.description = "Maksimal 100 karakter";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length > 0) {
      (next.amount ? amountRef.current : dateRef.current)?.focus();
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ type, amount: value, category, description: description.trim() || null, date: dateInputToIso(date) });
    } catch (err) {
      setFormError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={ui.form}>
      <div className={ui.seg} role="radiogroup" aria-label="Jenis transaksi">
        {(["EXPENSE", "INCOME"] as const).map((t) => (
          <label key={t}>
            <input type="radio" name={id("type")} value={t} checked={type === t} onChange={() => changeType(t)} />
            <span className={t === "INCOME" ? ui.segIncome : ui.segExpense}>{t === "INCOME" ? "Pemasukan" : "Pengeluaran"}</span>
          </label>
        ))}
      </div>

      <div className={ui.field}>
        <label htmlFor={id("amount")} className={ui.label}>Nominal</label>
        <div className={ui.prefixWrap}>
          <span aria-hidden="true">Rp</span>
          <input
            ref={amountRef}
            data-autofocus
            id={id("amount")}
            className={cx(ui.input, ui.inputPrefixed)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={amount ? Number(amount).toLocaleString("id-ID") : ""}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 13))}
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? id("amount-err") : undefined}
          />
        </div>
        {errors.amount && <p id={id("amount-err")} className={ui.fieldError}>{errors.amount}</p>}
      </div>

      <div className={ui.row2}>
        <div className={ui.field}>
          <label htmlFor={id("cat")} className={ui.label}>Kategori</label>
          <select id={id("cat")} className={ui.input} value={category} onChange={(e) => setCategory(e.target.value)}>
            {options.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className={ui.field}>
          <label htmlFor={id("date")} className={ui.label}>Tanggal</label>
          <input
            ref={dateRef}
            id={id("date")}
            type="date"
            className={ui.input}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? id("date-err") : undefined}
          />
          {errors.date && <p id={id("date-err")} className={ui.fieldError}>{errors.date}</p>}
        </div>
      </div>

      <div className={ui.field}>
        <label htmlFor={id("desc")} className={ui.label}>Catatan (opsional)</label>
        <input
          id={id("desc")}
          className={ui.input}
          maxLength={100}
          placeholder="Misal: ayam geprek"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? id("desc-err") : undefined}
        />
        {errors.description && <p id={id("desc-err")} className={ui.fieldError}>{errors.description}</p>}
      </div>

      {formError && <p role="alert" className={ui.formError}>{formError}</p>}

      <div className={ui.formActions}>
        <button type="button" className={cx(ui.btn, ui.btnGhost)} onClick={onCancel}>Batal</button>
        <button type="submit" className={cx(ui.btn, ui.btnPrimary)} disabled={saving}>
          {saving ? "Menyimpan…" : initial ? "Simpan perubahan" : "Simpan"}
        </button>
      </div>
    </form>
  );
}