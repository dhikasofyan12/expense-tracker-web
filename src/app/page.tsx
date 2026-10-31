import { Suspense } from "react";
import type { Metadata } from "next";
import AuthLinks, { GuestLinks } from "./AuthLinks";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "MyExpense | Catat pemasukan dan pengeluaran",
  description:
    "Catat pemasukan dan pengeluaran harian, lalu lihat ringkasan bulananmu dalam rupiah.",
};

const FEATURES = [
  {
    title: "Catat dalam hitungan detik",
    text: "Tambah, ubah, dan hapus transaksi. Nominal otomatis diformat dalam rupiah, tanggal dalam format Indonesia.",
  },
  {
    title: "Ringkasan bulanan",
    text: "Saldo, total pemasukan, dan total pengeluaran per bulan, plus lima kategori pengeluaran terbesar.",
  },
  {
    title: "Datamu milik akunmu",
    text: "Setiap akun hanya bisa melihat transaksinya sendiri. Masuk dengan email dan password.",
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>MyExpense</span>
        <Suspense fallback={<GuestLinks compact />}>
          <AuthLinks compact />
        </Suspense>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>
            Tahu ke mana uangmu pergi, tanpa spreadsheet.
          </h1>
          <p className={styles.lead}>
            Catat pemasukan dan pengeluaran harianmu, lalu lihat saldo bulan
            ini sekali buka.
          </p>
          <Suspense fallback={<GuestLinks />}>
            <AuthLinks />
          </Suspense>
        </section>

        <section className={styles.features} aria-label="Fitur">
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.feature}>
              <h2 className={styles.featureTitle}>{f.title}</h2>
              <p className={styles.featureText}>{f.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className={styles.footer}>
        MyExpense, proyek portfolio. Dibuat dengan Next.js, Prisma, dan
        PostgreSQL.
      </footer>
    </div>
  );
}