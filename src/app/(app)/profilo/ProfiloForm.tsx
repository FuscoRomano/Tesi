"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { aggiornaProfilo, aggiornaPassword } from "./actions";
import styles from "./profilo.module.css";

type DatiIniziali = {
  nome: string;
  cognome: string;
  telefono: string;
  email: string;
};

type Esito = { tipo: "successo" | "errore"; testo: string } | null;

/**
 * Form client per la gestione del profilo utente.
 * Tre blocchi: dati anagrafici (+ email), sicurezza (password) e sessione
 * (logout). Le scritture passano dalle Server Actions in actions.ts.
 */
export default function ProfiloForm({
  datiIniziali,
}: {
  datiIniziali: DatiIniziali;
}) {
  const router = useRouter();

  // Anagrafica
  const [nome, setNome] = useState(datiIniziali.nome);
  const [cognome, setCognome] = useState(datiIniziali.cognome);
  const [telefono, setTelefono] = useState(datiIniziali.telefono);
  const [email, setEmail] = useState(datiIniziali.email);
  const [esitoDati, setEsitoDati] = useState<Esito>(null);
  const [salvataggioDati, avviaSalvataggioDati] = useTransition();

  // Password
  const [password, setPassword] = useState("");
  const [confermaPassword, setConfermaPassword] = useState("");
  const [esitoPassword, setEsitoPassword] = useState<Esito>(null);
  const [salvataggioPassword, avviaSalvataggioPassword] = useTransition();

  // Logout
  const [uscita, setUscita] = useState(false);

  function salvaDati(e: React.FormEvent) {
    e.preventDefault();
    setEsitoDati(null);
    avviaSalvataggioDati(async () => {
      const r = await aggiornaProfilo({ nome, cognome, telefono, email });
      if (r.error) {
        setEsitoDati({ tipo: "errore", testo: r.error });
        return;
      }
      setEsitoDati({
        tipo: "successo",
        testo: r.avviso ?? "Dati aggiornati con successo.",
      });
      // Rinfresca i Server Component (es. eventuali viste che usano il nome).
      router.refresh();
    });
  }

  function salvaPassword(e: React.FormEvent) {
    e.preventDefault();
    setEsitoPassword(null);

    if (password !== confermaPassword) {
      setEsitoPassword({ tipo: "errore", testo: "Le password non coincidono." });
      return;
    }

    avviaSalvataggioPassword(async () => {
      const r = await aggiornaPassword(password);
      if (r.error) {
        setEsitoPassword({ tipo: "errore", testo: r.error });
        return;
      }
      setPassword("");
      setConfermaPassword("");
      setEsitoPassword({ tipo: "successo", testo: "Password aggiornata." });
    });
  }

  async function handleLogout() {
    setUscita(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className={styles.griglia}>
      {/* --- Dati anagrafici --- */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitolo}>Dati personali</h2>
          <span className={styles.badgeRuolo}>Medico</span>
        </div>

        <form onSubmit={salvaDati} className={styles.form} noValidate>
          <div className={styles.rigaDoppia}>
            <div className={styles.campo}>
              <label htmlFor="nome" className={styles.etichetta}>
                Nome
              </label>
              <input
                id="nome"
                type="text"
                autoComplete="given-name"
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
            />
            <span className={styles.aiuto}>
              Cambiando l&apos;email riceverai un link di conferma sul nuovo indirizzo.
            </span>
          </div>

          <div className={styles.campo}>
            <label htmlFor="telefono" className={styles.etichetta}>
              Telefono
            </label>
            <input
              id="telefono"
              type="tel"
              autoComplete="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={styles.input}
              placeholder="+39 333 1234567"
            />
          </div>

          {esitoDati && (
            <p
              role="alert"
              className={
                esitoDati.tipo === "errore" ? styles.errore : styles.successo
              }
            >
              {esitoDati.testo}
            </p>
          )}

          <div className={styles.azioniForm}>
            <button
              type="submit"
              disabled={salvataggioDati}
              className={styles.bottonePrimario}
            >
              {salvataggioDati ? "Salvataggio..." : "Salva modifiche"}
            </button>
          </div>
        </form>
      </section>

      {/* --- Sicurezza: password --- */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitolo}>Sicurezza</h2>
        </div>

        <form onSubmit={salvaPassword} className={styles.form} noValidate>
          <div className={styles.campo}>
            <label htmlFor="password" className={styles.etichetta}>
              Nuova password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="confermaPassword" className={styles.etichetta}>
              Conferma password
            </label>
            <input
              id="confermaPassword"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confermaPassword}
              onChange={(e) => setConfermaPassword(e.target.value)}
              className={styles.input}
            />
          </div>

          {esitoPassword && (
            <p
              role="alert"
              className={
                esitoPassword.tipo === "errore" ? styles.errore : styles.successo
              }
            >
              {esitoPassword.testo}
            </p>
          )}

          <div className={styles.azioniForm}>
            <button
              type="submit"
              disabled={salvataggioPassword || password.length === 0}
              className={styles.bottonePrimario}
            >
              {salvataggioPassword ? "Aggiornamento..." : "Cambia password"}
            </button>
          </div>
        </form>
      </section>

      {/* --- Sessione: logout --- */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitolo}>Sessione</h2>
        </div>
        <p className={styles.aiuto}>
          Esci dal tuo account su questo dispositivo.
        </p>
        <div className={styles.azioniForm}>
          <button
            type="button"
            onClick={handleLogout}
            disabled={uscita}
            className={styles.bottoneLogout}
          >
            {uscita ? "Disconnessione..." : "Esci dall'account"}
          </button>
        </div>
      </section>
    </div>
  );
}
