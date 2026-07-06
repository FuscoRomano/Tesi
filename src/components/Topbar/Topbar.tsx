"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./Topbar.module.css";

/**
 * Barra superiore dell'area applicativa.
 * Ospita in alto a destra due azioni rapide:
 *  - icona Utente: porta alla pagina di gestione del profilo (/profilo);
 *  - icona On/Off: disconnette l'utente (ex pulsante "Esci" della Sidebar).
 *
 * È un Client Component perché gestisce il logout lato browser e usa
 * usePathname per evidenziare l'icona utente quando si è sul profilo.
 */
export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [uscita, setUscita] = useState(false);

  // L'icona utente è "attiva" quando si è nella sezione profilo.
  const profiloAttivo =
    pathname === "/profilo" || pathname.startsWith("/profilo/");

  /**
   * Disconnessione: termina la sessione Supabase lato browser e reindirizza
   * al login. router.refresh() rigenera i Server Component senza sessione.
   */
  async function handleLogout() {
    setUscita(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.azioni}>
        {/* Area utente */}
        <Link
          href="/profilo"
          aria-label="Area utente"
          title="Area utente"
          className={`${styles.iconButton} ${
            profiloAttivo ? styles.iconButtonActive : ""
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>

        {/* Esci (icona On/Off) */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={uscita}
          aria-label={uscita ? "Disconnessione in corso" : "Esci"}
          title="Esci"
          className={`${styles.iconButton} ${styles.iconButtonLogout}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2v10" />
            <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
          </svg>
        </button>
      </div>
    </header>
  );
}
