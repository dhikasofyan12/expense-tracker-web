"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { deleteAccountSchema } from "@/lib/validations/account";
import { pesanAuthError } from "@/lib/auth-errors";
import styles from "./settings.module.css";

export default function DeleteAccount() {
  const router = useRouter();
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function batal() {
    setOpen(false);
    setPassword("");
    setConfirmText("");
    setError(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsed = deleteAccountSchema.safeParse({ password, confirmText });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error: apiError } = await authClient.deleteUser({
      password: parsed.data.password,
    });
    setLoading(false);

    if (apiError) {
      setError(pesanAuthError(apiError, "Gagal menghapus akun. Coba lagi."));
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <section className={`${styles.card} ${styles.danger}`} aria-labelledby={`${baseId}-h`}>
      <h2 id={`${baseId}-h`} className={styles.cardTitle}>
        Hapus akun
      </h2>
      <p className={styles.muted}>
        Akun beserta seluruh transaksimu akan dihapus permanen dan tidak bisa
        dikembalikan.
      </p>

      {!open ? (
        <div className={styles.actions}>
          <button type="button" className={styles.btnDanger} onClick={() => setOpen(true)}>
            Hapus akun saya
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor={`${baseId}-pw`} className={styles.label}>
              Password
            </label>
            <input
              id={`${baseId}-pw`}
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor={`${baseId}-txt`} className={styles.label}>
              Ketik <strong>HAPUS</strong> untuk konfirmasi
            </label>
            <input
              id={`${baseId}-txt`}
              className={styles.input}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={batal} disabled={loading}>
              Batal
            </button>
            <button type="submit" className={styles.btnDanger} disabled={loading}>
              {loading ? "Menghapus…" : "Ya, hapus permanen"}
            </button>
          </div>

          <p
            role="alert"
            className={error ? styles.error : styles.srOnly}
          >
            {error}
          </p>
        </form>
      )}
    </section>
  );
}