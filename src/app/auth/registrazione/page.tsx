"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./registrazione.module.css";

/*
 * Pagina di registrazione (riservata ai Medici).
 * Nel dominio aggiornato l'unico attore che può registrarsi e operare è il
 * Medico: non esiste più alcuna scelta di ruolo. Raccoglie nome, cognome,
 * email e password; i pazienti sono entità dati gestite dal medico.
 */
export default function RegistrazionePage() {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [successo, setSuccesso] = useState(false);
  const [caricamento, setCaricamento] = useState(false);

  async function handleRegistrazione(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setCaricamento(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          cognome,
          nome_completo: `${nome} ${cognome}`,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setErrore("Questa email è già registrata.");
      } else if (error.message.includes("Password")) {
        setErrore("La password deve essere di almeno 6 caratteri.");
      } else {
        setErrore("Errore durante la registrazione. Riprova.");
      }
      setCaricamento(false);
      return;
    }

    setSuccesso(true);
    setCaricamento(false);
  }

  if (successo) {
    return (
      <div className={styles.card}>
        <div className={styles.messaggio}>
          <h2 className={styles.messaggioTitolo}>Controlla la tua email</h2>
          <p className={styles.messaggioTesto}>
            Abbiamo inviato un link di conferma a <strong>{email}</strong>.
            Clicca sul link per attivare il tuo account.
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
        <h1 className={styles.titolo}>Crea account</h1>
        <p className={styles.sottotitolo}>Vytalia</p>
      </div>

      <form onSubmit={handleRegistrazione} className={styles.form} noValidate>
        <div className={styles.rigaDoppia}>
          <div className={styles.campo}>
            <label htmlFor="nome" className={styles.etichetta}>
              Nome
            </label>
            <input
              id="nome"
              type="text"
              autoComplete="given-name"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.campo}>
            <label htmlFor="cognome" className={styles.etichetta}>
              Cognome
            </label>
            <input
              id="cognome"
              type="text"
              autoComplete="family-name"
              required
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

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
            autoComplete="new-password"
            required
            minLength={6}
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

        <button
          type="submit"
          disabled={caricamento}
          className={styles.bottone}
        >
          {caricamento ? "Registrazione in corso..." : "Registrati"}
        </button>
      </form>

      <div className={styles.footer}>
        <span>Hai già un account?</span>
        <Link href="/auth/login" className={styles.link}>
          Accedi
        </Link>
      </div>
    </div>
  );
}
