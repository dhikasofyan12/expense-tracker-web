"use client";

import { authClient } from "@/lib/auth-client";
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";
import DeleteAccount from "./DeleteAccount";
import styles from "./settings.module.css";

export default function SettingsClient() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <p className={styles.muted} role="status">
        Memuat pengaturan…
      </p>
    );
  }

  // Jika tidak ada sesi, AuthGate/proxy yang mengalihkan ke /login.
  if (!data) return null;

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pengaturan akun</h1>
        <p className={styles.muted}>Kelola profil, keamanan, dan akunmu.</p>
      </header>

      <ProfileForm initialName={data.user.name} email={data.user.email} />
      <PasswordForm />
      <DeleteAccount />
    </div>
  );
}