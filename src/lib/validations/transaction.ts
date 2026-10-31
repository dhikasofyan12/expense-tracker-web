import { z } from "zod";
import { TransactionType } from "@/generated/prisma/client";

const dateString = z.string().refine((v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Tanggal harus berformat YYYY-MM-DD dan valid.");

export const transactionInput = z.object({
  type: z.enum(TransactionType),
  amount: z
    .number()
    .int("Nominal harus bilangan bulat (Rupiah).")
    .positive("Nominal harus lebih dari 0.")
    .max(9_999_999_999_999, "Nominal terlalu besar."),
  category: z.string().trim().min(1, "Kategori wajib diisi.").max(50, "Kategori maksimal 50 karakter."),
   description: z
    .string()
    .trim()
    .max(200, "Deskripsi maksimal 200 karakter.")
    .transform((v) => v || null)
    .nullish(),
  date: dateString,
});

export const transactionUpdate = transactionInput
  .partial()
  .refine((o) => Object.keys(o).length > 0, "Tidak ada data untuk diubah.");

export const listQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month harus berformat YYYY-MM.").optional(),
  type: z.enum(TransactionType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function toDbDate(v: string) {
  return new Date(`${v}T00:00:00.000Z`);
}