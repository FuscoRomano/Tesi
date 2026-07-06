"use client";

import { useState, useTransition } from "react";
import {
  aggiungiPaziente,
  eliminaPaziente,
  type PazienteRiga,
} from "./actions";
import styles from "./pazienti.module.css";

/**
 * Gestore client dei pazienti: form di inserimento manuale + tabella elenco.
 * Mantiene l'elenco in stato locale aggiornandolo in modo ottimistico dopo le
 * Server Actions (insert/delete), senza ricaricare l'intera pagina.
 */
export default function PazientiManager({
  pazientiIniziali,
}: {
  pazientiIniziali: PazienteRiga[];
}) {
  const [pazienti, setPazienti] = useState<PazienteRiga[]>(pazientiIniziali);

  // Campi del form
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [dataNascita, setDataNascita] = useState("");

  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  function handleAggiungi(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);

    avvia(async () => {
      const r = await aggiungiPaziente({ nome, cognome, dataNascita });
      if (r.error || !r.paziente) {
        setErrore(r.error ?? "Impossibile aggiungere il paziente.");
        return;
      }
      // Inserisce mantenendo l'ordine per cognome, poi nome.
      setPazienti((prec) =>
        [...prec, r.paziente!].sort(
          (a, b) =>
            a.cognome.localeCompare(b.cognome) || a.nome.localeCompare(b.nome),
        ),
      );
      setNome("");
      setCognome("");
      setDataNascita("");
    });
  }

  function handleElimina(id: string) {
    setErrore(null);
    avvia(async () => {
      const r = await eliminaPaziente(id);
      if (r.error) {
        setErrore(r.error);
        return;
      }
      setPazienti((prec) => prec.filter((p) => p.id !== id));
    });
  }

  return (
    <div className={styles.contenuto}>
      {/* Form di inserimento manuale */}
      <form onSubmit={handleAggiungi} className={styles.card} noValidate>
        <span className={styles.cardTitolo}>Nuovo paziente</span>

        <div className={styles.rigaCampi}>
          <div className={styles.campo}>
            <label htmlFor="nome" className={styles.etichetta}>
              Nome
            </label>
            <input
              id="nome"
              type="text"
              className={styles.input}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="cognome" className={styles.etichetta}>
              Cognome
            </label>
            <input
              id="cognome"
              type="text"
              className={styles.input}
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              required
            />
          </div>

          <div className={styles.campo}>
            <label htmlFor="dataNascita" className={styles.etichetta}>
              Data di nascita
            </label>
            <input
              id="dataNascita"
              type="date"
              className={styles.input}
              value={dataNascita}
              onChange={(e) => setDataNascita(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className={styles.bottone}
            disabled={inCorso || !nome.trim() || !cognome.trim()}
          >
            {inCorso ? "Salvataggio…" : "Aggiungi paziente"}
          </button>
        </div>

        {errore && (
          <p role="alert" className={styles.errore}>
            {errore}
          </p>
        )}
      </form>

      {/* Elenco pazienti */}
      <div className={styles.card}>
        <span className={styles.cardTitolo}>
          I tuoi pazienti ({pazienti.length})
        </span>

        {pazienti.length === 0 ? (
          <p className={styles.vuoto}>
            Nessun paziente ancora. Aggiungi il primo con il form qui sopra.
          </p>
        ) : (
          <div className={styles.tabellaWrap}>
            <table className={styles.tabella}>
              <thead>
                <tr>
                  <th>Cognome</th>
                  <th>Nome</th>
                  <th>Data di nascita</th>
                  <th>Preso in carico</th>
                  <th aria-label="Azioni" />
                </tr>
              </thead>
              <tbody>
                {pazienti.map((p) => (
                  <tr key={p.id}>
                    <td>{p.cognome}</td>
                    <td>{p.nome}</td>
                    <td>
                      {p.data_nascita
                        ? new Date(p.data_nascita).toLocaleDateString("it-IT")
                        : "—"}
                    </td>
                    <td>
                      {new Date(p.creato_il).toLocaleDateString("it-IT")}
                    </td>
                    <td className={styles.cellaAzioni}>
                      <button
                        type="button"
                        className={styles.bottoneElimina}
                        onClick={() => handleElimina(p.id)}
                        disabled={inCorso}
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
