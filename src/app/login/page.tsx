import Link from "next/link";
import LoginForm from "./LoginForm";
import styles from "./login.module.css";

export const metadata = { title: "Login | MyExpense" };

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <span className={`${styles.orb} ${styles.orbTop}`} aria-hidden="true" />
      <span className={`${styles.orb} ${styles.orbBottom}`} aria-hidden="true" />

      <section className={styles.hero}>
        <h1 className={styles.title}>Welcome To MyExpense</h1>
        <p className={styles.tagline}>Catat dan pantau pengeluaranmu dengan mudah.</p>
        <Link href="/" className={styles.skip}>Skip Now</Link>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Login</h2>
        <LoginForm />
      </section>
    </main>
  );
}