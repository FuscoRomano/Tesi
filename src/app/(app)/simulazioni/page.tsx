"use client";

import { useCallback, useEffect, useState } from "react";
import {
  elencaPazienti,
  elencaSimulazioniSalvati,
  salvaSimulazione,
} from "./actions";
import type {
  ParametriVitali,
  PazienteOpzione,
  SimulazioneEstratto,
  SimulazioneSalvato,
  SensoreId,
} from "@/types/simulazione";
import styles from "./simulazioni.module.css";

/*
 * Pagina "Simulatore Pazienti" — core dell'Information Extraction.
 *
 * Il clinico descrive una simulazione in linguaggio naturale e seleziona persona,
 * sensori e durata. Alla pressione di "Genera Simulazione" il testo viene inviato
 * a /api/extract (simulazione LLM) che restituisce un JSON strutturato con i
 * parametri vitali estratti. L'utente può quindi scaricare il dataset CSV,
 * generato lato server da /api/convert tramite lo script Python (pandas).
 */

/* ------------------------------------------------------------------ */
/* Tipi e costanti                                                     */
/* ------------------------------------------------------------------ */

/** Catalogo dei sensori selezionabili, con i parametri che ciascuno misura. */
const SENSORI: { id: SensoreId; nome: string; parametri: string }[] = [
  { id: "sfigmomanometro", nome: "Sfigmomanometro", parametri: "SYS · DIA · BPM" },
  { id: "saturimetro", nome: "Saturimetro", parametri: "SAT · BPM" },
  { id: "holter_glicemico", nome: "Holter glicemico", parametri: "Glicemia" },
  { id: "bilancia", nome: "Bilancia bioimpedenza", parametri: "Peso" },
  { id: "cardiofrequenzimetro", nome: "Cardiofrequenzimetro", parametri: "BPM" },
];

/** Colonne possibili dei parametri, nell'ordine di visualizzazione. */
const COLONNE_PARAMETRI: { chiave: keyof ParametriVitali; label: string }[] = [
  { chiave: "sys", label: "SYS" },
  { chiave: "dia", label: "DIA" },
  { chiave: "bpm", label: "BPM" },
  { chiave: "sat", label: "SAT" },
  { chiave: "glicemia", label: "Glicemia" },
  { chiave: "peso", label: "Peso" },
];

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export default function SimulazioniPage() {
  // Stato del form
  const [simulazione, setSimulazione] = useState("");
  const [persona, setPersona] = useState("");
  const [sensori, setSensori] = useState<SensoreId[]>(["sfigmomanometro", "saturimetro"]);
  const [durataMinuti, setDurataMinuti] = useState(30);

  // Stato del flusso
  const [caricamento, setCaricamento] = useState(false);
  const [scaricamento, setScaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [risultato, setRisultato] = useState<SimulazioneEstratto | null>(null);

  // Stato della persistenza su Supabase
  const [pazienteId, setPazienteId] = useState<string>("");
  const [pazienti, setPazienti] = useState<PazienteOpzione[]>([]);
  const [simulazioniSalvati, setSimulazioniSalvati] = useState<SimulazioneSalvato[]>([]);
  const [salvataggio, setSalvataggio] = useState(false);
  const [esitoSalvataggio, setEsitoSalvataggio] = useState<string | null>(null);

  /** Ricarica l'elenco delle simulazioni salvate visibili all'utente. */
  const aggiornaSimulazioniSalvati = useCallback(async () => {
    const esito = await elencaSimulazioniSalvati();
    if (esito.simulazioni) setSimulazioniSalvati(esito.simulazioni);
  }, []);

  // Caricamento iniziale: pazienti selezionabili + simulazioni già salvati.
  // Gli errori qui sono silenziosi (es. migration non ancora applicata): la
  // generazione della simulazione resta comunque utilizzabile.
  useEffect(() => {
    elencaPazienti().then((esito) => {
      if (esito.pazienti) setPazienti(esito.pazienti);
    });
    aggiornaSimulazioniSalvati();
  }, [aggiornaSimulazioniSalvati]);

  /** Attiva/disattiva un sensore nella selezione multipla. */
  function toggleSensore(id: SensoreId) {
    setSensori((prec) =>
      prec.includes(id) ? prec.filter((s) => s !== id) : [...prec, id],
    );
  }

  /** Invia la simulazione all'API di estrazione (simulazione LLM). */
  async function handleGenera(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setRisultato(null);
    setEsitoSalvataggio(null);
    setCaricamento(true);

    try {
      const risposta = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulazione, persona, sensori, durataMinuti }),
      });

      const dati = await risposta.json();

      if (!risposta.ok) {
        setErrore(dati.error ?? "Errore durante la generazione della simulazione.");
        return;
      }

      setRisultato(dati as SimulazioneEstratto);
    } catch {
      setErrore("Impossibile contattare il servizio di estrazione. Riprova.");
    } finally {
      setCaricamento(false);
    }
  }

  /** Richiede la conversione in CSV e avvia il download nel browser. */
  async function handleScarica() {
    if (!risultato) return;
    setErrore(null);
    setScaricamento(true);

    try {
      const risposta = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(risultato),
      });

      if (!risposta.ok) {
        const dati = await risposta.json().catch(() => null);
        setErrore(dati?.error ?? "Errore durante la generazione del CSV.");
        return;
      }

      // Trasforma la risposta in blob e forza il download tramite anchor.
      const blob = await risposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${risultato.simulazione.id}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrore("Impossibile generare il dataset CSV. Riprova.");
    } finally {
      setScaricamento(false);
    }
  }

  /** Salva la simulazione generata su Supabase (header + campioni). */
  async function handleSalva() {
    if (!risultato) return;
    setErrore(null);
    setEsitoSalvataggio(null);
    setSalvataggio(true);

    try {
      const esito = await salvaSimulazione(risultato, pazienteId || null);
      if (esito.error) {
        setErrore(esito.error);
        return;
      }
      setEsitoSalvataggio("Simulazione salvata correttamente.");
      await aggiornaSimulazioniSalvati();
    } catch {
      setErrore("Impossibile salvare la simulazione. Riprova.");
    } finally {
      setSalvataggio(false);
    }
  }

  // Anteprima: primi campioni e colonne effettivamente presenti.
  const anteprima = risultato?.campioni.slice(0, 8) ?? [];
  const colonneVisibili = COLONNE_PARAMETRI.filter((c) =>
    anteprima.some((campione) => campione.parametri[c.chiave] !== undefined),
  );

  return (
    <section className={styles.pagina}>
      {/* Intestazione */}
      <header className={styles.intestazione}>
        <h1 className={styles.titolo}>Simulatore Pazienti</h1>
        <p className={styles.sottotitolo}>
          Descrivi una simulazione clinica in linguaggio naturale: il sistema estrae
          i parametri vitali e genera un dataset simulato per il Digital Twin.
        </p>
      </header>

      <form onSubmit={handleGenera} className={styles.formGriglia}>
        {/* Colonna principale: simulazione in linguaggio naturale */}
        <div className={styles.card}>
          <div className={styles.campoPrincipale}>
            <label htmlFor="simulazione" className={styles.etichetta}>
              Simulazione clinica
            </label>
            <span className={styles.aiuto}>
              Es. &laquo;Donna di 72 anni, ipertesa, riferisce dispnea e
              affaticamento durante la mattinata.&raquo;
            </span>
            <textarea
              id="simulazione"
              className={styles.textarea}
              value={simulazione}
              onChange={(e) => setSimulazione(e.target.value)}
              placeholder="Inserisci la descrizione clinica in linguaggio naturale…"
            />
          </div>
        </div>

        {/* Colonna secondaria: persona, sensori, durata */}
        <div className={styles.card}>
          <span className={styles.cardTitolo}>Parametri di simulazione</span>

          <div className={styles.campo}>
            <label htmlFor="persona" className={styles.etichetta}>
              Persona
            </label>
            <input
              id="persona"
              type="text"
              className={styles.input}
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="Es. Donna, 72 anni, ipertesa"
            />
          </div>

          <div className={styles.campo}>
            <span className={styles.etichetta}>Sensori da simulare</span>
            <div className={styles.sensori}>
              {SENSORI.map((s) => {
                const attivo = sensori.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`${styles.sensore} ${attivo ? styles.sensoreAttivo : ""}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={attivo}
                      onChange={() => toggleSensore(s.id)}
                    />
                    {s.nome}
                    <span className={styles.sensoreMeta}>{s.parametri}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className={styles.campo}>
            <label htmlFor="durata" className={styles.etichetta}>
              Durata (minuti)
            </label>
            <input
              id="durata"
              type="number"
              min={1}
              max={1440}
              className={styles.input}
              value={durataMinuti}
              onChange={(e) => setDurataMinuti(Number(e.target.value))}
            />
            <span className={styles.aiuto}>
              Un campione al minuto (max 1440 = 24 ore).
            </span>
          </div>

          {/* Associazione della simulazione a un paziente preso in carico dal medico. */}
          <div className={styles.campo}>
            <label htmlFor="paziente" className={styles.etichetta}>
              Paziente associato
            </label>
            <select
              id="paziente"
              className={styles.input}
              value={pazienteId}
              onChange={(e) => setPazienteId(e.target.value)}
            >
              <option value="">Nessuno (non associato)</option>
              {pazienti.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome ?? p.id}
                </option>
              ))}
            </select>
            <span className={styles.aiuto}>
              {pazienti.length === 0
                ? "Nessun paziente: aggiungine dalla sezione Pazienti."
                : "Collega la simulazione a un tuo paziente."}
            </span>
          </div>
        </div>

        {/* Barra azioni: occupa l'intera larghezza della griglia */}
        <div className={styles.azioni} style={{ gridColumn: "1 / -1" }}>
          <button type="submit" className={styles.bottone} disabled={caricamento}>
            {caricamento ? "Generazione…" : "Genera Simulazione"}
          </button>

          {caricamento && (
            <span className={styles.stato}>
              <span className={styles.spinner} aria-hidden="true" />
              Estrazione parametri in corso…
            </span>
          )}

          {risultato && !caricamento && (
            <>
              <button
                type="button"
                className={styles.bottoneSecondario}
                onClick={handleScarica}
                disabled={scaricamento}
              >
                {scaricamento ? "Preparazione CSV…" : "Scarica dataset CSV"}
              </button>

              <button
                type="button"
                className={styles.bottoneSecondario}
                onClick={handleSalva}
                disabled={salvataggio}
              >
                {salvataggio ? "Salvataggio…" : "Salva simulazione"}
              </button>
            </>
          )}

          {esitoSalvataggio && (
            <span className={styles.esitoOk}>{esitoSalvataggio}</span>
          )}
        </div>
      </form>

      {errore && (
        <p role="alert" className={styles.errore}>
          {errore}
        </p>
      )}

      {/* Riepilogo dei parametri estratti */}
      {risultato && (
        <div className={`${styles.card} ${styles.risultati}`}>
          <div className={styles.risultatiHeader}>
            <span className={styles.cardTitolo}>Parametri estratti</span>
            {risultato.modalita === "ia" ? (
              <span className={styles.badgeIa} title="Profilo clinico generato da Google Gemini">
                ✨ Generato da Gemini
              </span>
            ) : (
              <span
                className={styles.badgeSimulato}
                title="Gemini non disponibile: dati generati con le euristiche locali"
              >
                Modalità simulata
              </span>
            )}
          </div>

          <div className={styles.riepilogoMeta}>
            <div className={styles.metaVoce}>
              <span className={styles.metaLabel}>ID simulazione</span>
              <span className={styles.metaValore}>{risultato.simulazione.id}</span>
            </div>
            <div className={styles.metaVoce}>
              <span className={styles.metaLabel}>Profilo clinico</span>
              <span className={styles.metaValore}>
                {risultato.persona.profiloClinico}
              </span>
            </div>
            <div className={styles.metaVoce}>
              <span className={styles.metaLabel}>Campioni</span>
              <span className={styles.metaValore}>{risultato.campioni.length}</span>
            </div>
            <div className={styles.metaVoce}>
              <span className={styles.metaLabel}>Sensori</span>
              <span className={styles.metaValore}>{risultato.sensori.length}</span>
            </div>
          </div>

          {/* Anteprima tabellare dei primi campioni */}
          <div className={styles.tabellaWrap}>
            <table className={styles.tabella}>
              <thead>
                <tr>
                  <th>Minuto</th>
                  {colonneVisibili.map((c) => (
                    <th key={c.chiave}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {anteprima.map((campione) => (
                  <tr key={campione.minutoRelativo}>
                    <td>{campione.minutoRelativo}</td>
                    {colonneVisibili.map((c) => (
                      <td key={c.chiave}>{campione.parametri[c.chiave] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className={styles.notaTabella}>
            Anteprima dei primi {anteprima.length} campioni su{" "}
            {risultato.campioni.length}. Scarica il CSV per il dataset completo.
          </span>
        </div>
      )}

      {/* Elenco delle simulazioni già salvati su Supabase (filtrati dalla RLS) */}
      {simulazioniSalvati.length > 0 && (
        <div className={`${styles.card} ${styles.risultati}`}>
          <span className={styles.cardTitolo}>Simulazioni salvate</span>
          <div className={styles.tabellaWrap}>
            <table className={`${styles.tabella} ${styles.tabellaSimulazioni}`}>
              <thead>
                <tr>
                  <th>Descrizione</th>
                  <th>Profilo clinico</th>
                  <th>Durata</th>
                  <th>Sensori</th>
                  <th>Creato il</th>
                </tr>
              </thead>
              <tbody>
                {simulazioniSalvati.map((s) => (
                  <tr key={s.id}>
                    <td>{s.descrizione}</td>
                    <td>{s.profilo_clinico ?? "—"}</td>
                    <td>{s.durata_minuti} min</td>
                    <td>{s.sensori.length}</td>
                    <td>{new Date(s.creato_il).toLocaleString("it-IT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
