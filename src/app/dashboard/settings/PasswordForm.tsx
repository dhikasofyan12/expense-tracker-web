"use client";

import { useId, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { changePasswordSchema } from "@/lib/validations/account";
import { pesanAuthError } from "@/lib/auth-errors";
import styles from "./settings.module.css";

type Status = { type: "ok" | "error"; text: string } | null;

export default function PasswordForm() {
  const baseId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!parsed.success) {
      setStatus({ type: "error", text: parsed.error.issues[0].message });
      return;
    }

    setLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      revokeOtherSessions: true,
    });
    setLoading(false);

    if (error) {
      setStatus({
        type: "error",
        text: pesanAuthError(error, "Gagal mengganti password. Coba lagi."),
      });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setStatus({
      type: "ok",
      text: "Password diganti. Perangkat lain otomatis keluar.",
    });
  }

  return (
    <section className={styles.card} aria-labelledby={`${baseId}-h`}>
      <h2 id={`${baseId}-h`} className={styles.cardTitle}>
        Ganti password
      </h2>
      <form onSubmit={onSubmit} className={styles.form} noValidate>
        <div className={styles.field}>
          <label htmlFor={`${baseId}-cur`} className={styles.label}>
            Password saat ini
          </label>
          <input
            id={`${baseId}-cur`}
            type="password"
            className={styles.input}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={`${baseId}-new`} className={styles.label}>
            Password baru
          </label>
          <input
            id={`${baseId}-new`}
            type="password"
            className={styles.input}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <span className={styles.hint}>Minimal 8 karakter.</span>
        </div>

        <div className={styles.field}>
          <label htmlFor={`${baseId}-conf`} className={styles.label}>
            Ulangi password baru
          </label>
          <input
            id={`${baseId}-conf`}
            type="password"
            className={styles.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? "Menyimpan…" : "Ganti password"}
          </button>
        </div>

        <p
          role="status"
          aria-live="polite"
          className={status ? (status.type === "ok" ? styles.ok : styles.error) : styles.srOnly}
        >
          {status?.text}
        </p>
      </form>
    </section>
  );
}