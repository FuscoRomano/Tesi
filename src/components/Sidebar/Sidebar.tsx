"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

/**
 * Voci di navigazione della Sidebar.
 * Centralizzate in un array per rendere semplice l'aggiunta di nuove sezioni
 * negli step successivi del progetto.
 */
const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/simulazioni", label: "Simulatore Pazienti" },
  { href: "/pazienti", label: "Pazienti" },
];

/**
 * Barra di navigazione laterale.
 * È un Client Component perché usa `usePathname` per evidenziare il link
 * corrispondente alla rotta attualmente attiva.
 *
 * Il logout è stato spostato nella Topbar (icona On/Off in alto a destra).
 */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      {/* Intestazione / brand della piattaforma */}
      <div className={styles.brand}>
        <span className={styles.brandTitle}>Vytalia</span>
        <span className={styles.brandSubtitle}>Health Dashboard</span>
      </div>

      {/* Menu di navigazione principale */}
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            // Una voce è attiva se il pathname coincide o ne è una sotto-rotta.
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${
                    isActive ? styles.navLinkActive : ""
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
