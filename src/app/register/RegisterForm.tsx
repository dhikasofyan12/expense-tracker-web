"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import styles from "../login/login.module.css";

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));

    if (!name || !email || !password) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    const { error } = await authClient.signUp.email({ name, email, password });

    if (error) {
      setError(
        error.status === 422
          ? "Pendaftaran gagal. Email mungkin sudah terdaftar."
          : "Terjadi kesalahan. Coba lagi."
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <label className={styles.srOnly} htmlFor="name">Nama</label>
      <input id="name" name="name" type="text" placeholder="Nama"
        autoComplete="name" required className={styles.input} />

      <label className={styles.srOnly} htmlFor="email">Email</label>
      <input id="email" name="email" type="email" placeholder="Email"
        autoComplete="email" required className={styles.input} />

      <label className={styles.srOnly} htmlFor="password">Password</label>
      <input id="password" name="password" type="password" placeholder="Password"
        autoComplete="new-password" required className={styles.input} />

      <label className={styles.srOnly} htmlFor="confirm">Konfirmasi Password</label>
      <input id="confirm" name="confirm" type="password" placeholder="Konfirmasi Password"
        autoComplete="new-password" required className={styles.input} />

      {error && <p role="alert" className={styles.error}>{error}</p>}

      <button type="submit" disabled={loading} className={styles.submit}>
        {loading ? "Memproses..." : "Daftar"}
      </button>

      <p className={styles.switch}>
        Sudah punya akun? <Link href="/login">Login</Link>
      </p>
    </form>
  );
}