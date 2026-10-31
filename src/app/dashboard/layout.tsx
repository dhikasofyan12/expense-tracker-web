import { Suspense } from "react";
import LogoutButton from "./LogoutButton";
import AuthGate from "./AuthGate";
import SidebarNav from "./SidebarNav";
import styles from "./dashboard.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div>
          <p className={styles.brand}>MyExpense</p>
          <Suspense fallback={null}>
            <SidebarNav />
          </Suspense>
        </div>
        <LogoutButton />
      </aside>

      <main className={styles.content}>
        <Suspense fallback={<p>Memuat...</p>}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </main>
    </div>
  );
}