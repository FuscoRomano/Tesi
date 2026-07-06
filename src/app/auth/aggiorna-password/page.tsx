"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./aggiorna-password.module.css";

/*
 * Pagina di aggiornamento password.
 * Raggiunta dopo il flusso di recupero: /auth/callback?type=recovery → qui.
 * A questo punto Supabase ha già impostato una sessione temporanea
 * tramite il code exchange nel callback.
 */
export default function AggiornaPasswordPage() {
  const router = useRouter();
  const [nuovaPassword, setNuovaPassword] = useState("");
  const [confermaPassword, setConfermaPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(false);

  async function handleAggiorna(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);

    if (nuovaPassword !== confermaPassword) {
      setErrore("Le password non coincidono.");
      return;
    }

    if (nuovaPassword.length < 6) {
      setErrore("La password deve essere di almeno 6 caratteri.");
      return;
    }

    setCaricamento(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: nuovaPassword,
    });

    if (error) {
      setErrore(
        "Errore nell'aggiornamento della password. Il link potrebbe essere scaduto."
      );
      setCaricamento(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.titolo}>Nuova password</h1>
        <p className={styles.sottotitolo}>
          Scegli una nuova password per il tuo account.
        </p>
      </div>

      <form onSubmit={handleAggiorna} className={styles.form} noValidate>
        <div className={styles.campo}>
          <label htmlFor="nuova-password" className={styles.etichetta}>
            Nuova password
          </label>
          <input
            id="nuova-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={nuovaPassword}
            onChange={(e) => setNuovaPassword(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.campo}>
          <label htmlFor="conferma-password" className={styles.etichetta}>
            Conferma password
          </label>
          <input
            id="conferma-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confermaPassword}
            onChange={(e) => setConfermaPassword(e.target.value)}
            className={styles.input}
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
          {caricamento ? "Aggiornamento..." : "Aggiorna password"}
        </button>
      </form>
    </div>
  );
}
