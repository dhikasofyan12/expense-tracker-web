import Link from "next/link";
import { getSession } from "@/lib/session";
import styles from "./landing.module.css";

type Props = { compact?: boolean };

export function GuestLinks({ compact }: Props) {
  return (
    <div className={styles.links}>
      <Link href="/login" className={styles.btnGhost}>
        Masuk
      </Link>
      <Link href="/register" className={styles.btn}>
        {compact ? "Daftar" : "Daftar gratis"}
      </Link>
    </div>
  );
}

export default async function AuthLinks({ compact }: Props) {
  const session = await getSession();

  if (session?.user) {
    return (
      <div className={styles.links}>
        <Link href="/dashboard" className={styles.btn}>
          Buka Dashboard
        </Link>
      </div>
    );
  }

  return <GuestLinks compact={compact} />;
}