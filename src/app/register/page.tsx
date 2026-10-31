import RegisterForm from "./RegisterForm";
import styles from "../login/login.module.css";

export const metadata = { title: "Daftar | MyExpense" };

export default function RegisterPage() {
  return (
    <main className={styles.page}>
      <span className={`${styles.orb} ${styles.orbTop}`} aria-hidden="true" />
      <span className={`${styles.orb} ${styles.orbBottom}`} aria-hidden="true" />

      <section className={styles.hero}>
        <h1 className={styles.title}>Join MyExpense</h1>
        <p className={styles.tagline}>Buat akun dan mulai catat pengeluaranmu.</p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Register</h2>
        <RegisterForm />
      </section>
    </main>
  );
}