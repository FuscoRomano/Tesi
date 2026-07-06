"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./login.module.css";

/*
 * Pagina di accesso alla piattaforma.
 * Gestisce l'autenticazione email/password tramite Supabase Auth.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setCaricamento(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message === "Invalid login credentials") {
        setErrore("Email o password non corretti.");
      } else if (error.message.includes("Email not confirmed")) {
        setErrore("Conferma la tua email prima di accedere.");
      } else {
        setErrore("Errore durante l'accesso. Riprova.");
      }
      setCaricamento(false);
      return;
    }

    // router.refresh() aggiorna il Server Component tree con la nuova sessione
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.titolo}>Vytalia</h1>
        <p className={styles.sottotitolo}>Accedi alla piattaforma</p>
      </div>

      <form onSubmit={handleLogin} className={styles.form} noValidate>
        <div className={styles.campo}>
          <label htmlFor="email" className={styles.etichetta}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="nome@ospedale.it"
          />
        </div>

        <div className={styles.campo}>
          <label htmlFor="password" className={styles.etichetta}>
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
        </div>

        {errore && (
          <p role="alert" className={styles.errore}>
            {errore}
          </p>
        )}

        <button type="submit" disabled={caricamento} className={styles.bottone}>
          {caricamento ? "Accesso in corso..." : "Accedi"}
        </button>
      </form>

      <div className={styles.footer}>
        <Link href="/auth/recupero-password" className={styles.link}>
          Password dimenticata?
        </Link>
        <span className={styles.separatore}>·</span>
        <Link href="/auth/registrazione" className={styles.link}>
          Crea account
        </Link>
      </div>
    </div>
  );
}
