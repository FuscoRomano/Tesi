"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./recupero-password.module.css";

/*
 * Pagina di recupero password.
 * Invia un'email con link di reset tramite Supabase Auth.
 * Il link porta a /auth/callback?type=recovery che poi redirige
 * a /auth/aggiorna-password.
 *
 * Mostra sempre un messaggio di successo per non rivelare
 * quali indirizzi email sono registrati nel sistema.
 */
export default function RecuperoPasswordPage() {
  const [email, setEmail] = useState("");
  const [inviato, setInviato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  async function handleRecupero(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setCaricamento(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      setErrore("Errore nell'invio dell'email. Verifica l'indirizzo e riprova.");
      setCaricamento(false);
      return;
    }

    setInviato(true);
    setCaricamento(false);
  }

  if (inviato) {
    return (
      <div className={styles.card}>
        <div className={styles.messaggio}>
          <h2 className={styles.messaggioTitolo}>Email inviata</h2>
          <p className={styles.messaggioTesto}>
            Se <strong>{email}</strong> è registrata, riceverai un link per
            reimpostare la password. Controlla anche la cartella spam.
          </p>
          <Link href="/auth/login" className={styles.linkBottone}>
            Torna al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.titolo}>Recupera password</h1>
        <p className={styles.sottotitolo}>
          Inserisci la tua email per ricevere il link di reset.
        </p>
      </div>

      <form onSubmit={handleRecupero} className={styles.form} noValidate>
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

        {errore && (
          <p role="alert" className={styles.errore}>
            {errore}
          </p>
        )}

        <button
          type="submit"
          disabled={caricamento}
          className={styles.bottone}
        >
          {caricamento ? "Invio in corso..." : "Invia link di reset"}
        </button>
      </form>

      <div className={styles.footer}>
        <Link href="/auth/login" className={styles.link}>
          ← Torna al login
        </Link>
      </div>
    </div>
  );
}
