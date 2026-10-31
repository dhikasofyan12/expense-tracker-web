"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import styles from "./login.module.css";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
      rememberMe: form.get("remember") === "on",
    });

    if (error) {
      setError(
        error.status === 401
          ? "Email atau password salah."
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
      <label className={styles.srOnly} htmlFor="email">Email</label>
      <input id="email" name="email" type="email" placeholder="Email"
        autoComplete="email" required className={styles.input} />

      <label className={styles.srOnly} htmlFor="password">Password</label>
      <input id="password" name="password" type="password" placeholder="Password"
        autoComplete="current-password" required className={styles.input} />

      <label className={styles.remember}>
        <input type="checkbox" name="remember" defaultChecked /> Remember me
      </label>

      {error && <p role="alert" className={styles.error}>{error}</p>}

      <button type="submit" disabled={loading} className={styles.submit}>
        {loading ? "Memproses..." : "Login"}
      </button>

      <p className={styles.switch}>
        Belum punya akun? <Link href="/register">Daftar</Link>
      </p>
    </form>
  );
}