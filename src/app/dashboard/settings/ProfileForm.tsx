"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { updateNameSchema } from "@/lib/validations/account";
import { pesanAuthError } from "@/lib/auth-errors";
import styles from "./settings.module.css";

type Status = { type: "ok" | "error"; text: string } | null;

export default function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const nameId = useId();
  const emailId = useId();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const parsed = updateNameSchema.safeParse({ name });
    if (!parsed.success) {
      setStatus({ type: "error", text: parsed.error.issues[0].message });
      return;
    }
    if (parsed.data.name === savedName) {
      setStatus({ type: "error", text: "Nama belum berubah." });
      return;
    }

    setLoading(true);
    const { error } = await authClient.updateUser({ name: parsed.data.name });
    setLoading(false);

    if (error) {
      setStatus({
        type: "error",
        text: pesanAuthError(error, "Gagal menyimpan nama. Coba lagi."),
      });
      return;
    }

    setSavedName(parsed.data.name);
    setName(parsed.data.name);
    setStatus({ type: "ok", text: "Nama berhasil diperbarui." });
    router.refresh();
  }

  return (
    <section className={styles.card} aria-labelledby={`${nameId}-h`}>
      <h2 id={`${nameId}-h`} className={styles.cardTitle}>
        Profil
      </h2>
      <form onSubmit={onSubmit} className={styles.form} noValidate>
        <div className={styles.field}>
          <label htmlFor={nameId} className={styles.label}>
            Nama
          </label>
          <input
            id={nameId}
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={60}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={emailId} className={styles.label}>
            Email
          </label>
          <input
            id={emailId}
            className={styles.input}
            value={email}
            readOnly
            aria-describedby={`${emailId}-hint`}
          />
          <span id={`${emailId}-hint`} className={styles.hint}>
            Email tidak dapat diubah.
          </span>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.btnPrimary} disabled={loading}>
            {loading ? "Menyimpan…" : "Simpan nama"}
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