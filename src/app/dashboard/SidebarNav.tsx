"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./sidebarnav.module.css";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/transactions", label: "Riwayat", exact: false },
  { href: "/dashboard/budgets", label: "Anggaran", exact: false },
  { href: "/dashboard/settings", label: "Pengaturan", exact: false },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu utama" className={styles.nav}>
      {LINKS.map((l) => {
        const active = l.exact
          ? pathname === l.href
          : pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={active ? styles.linkActive : styles.link}
            aria-current={active ? "page" : undefined}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}