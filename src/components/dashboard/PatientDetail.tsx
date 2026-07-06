/*
 * Vista Dettaglio del paziente selezionato:
 * - 4 card statistiche per i domini WHOQOL (Fisico, Psicologico, Relazioni,
 *   Ambiente) con barra di avanzamento colorata in base al punteggio;
 * - Bar Chart dell'andamento del sonno;
 * - Donut Chart dell'intensità dell'attività motoria.
 * I grafici sono client component dedicati (recharts).
 */

import type { Patient, WhoqolScores } from "@/types/patient";
import { calcolaPriorityScore, livelloSemaforoPaziente } from "@/lib/priority";
import SleepBarChart from "./SleepBarChart";
import ActivityDonutChart from "./ActivityDonutChart";
import styles from "./PatientDetail.module.css";

interface PatientDetailProps {
  paziente: Patient;
}

/* Configurazione delle 4 card WHOQOL: chiave del punteggio + etichetta. */
const DOMINI: { chiave: keyof WhoqolScores; etichetta: string }[] = [
  { chiave: "fisico", etichetta: "Fisico" },
  { chiave: "psicologico", etichetta: "Psicologico" },
  { chiave: "relazioni", etichetta: "Relazioni" },
  { chiave: "ambiente", etichetta: "Ambiente" },
];

/** Colore della barra in base al punteggio WHOQOL (0–100). */
function coloreDominio(valore: number): string {
  if (valore < 40) return "#dc2626"; // critico
  if (valore < 65) return "#f59e0b"; // da monitorare
  return "#16a34a"; // buono
}

export default function PatientDetail({ paziente }: PatientDetailProps) {
  const score = calcolaPriorityScore(paziente);
  const livello = livelloSemaforoPaziente(paziente);

  return (
    <div className={styles.contenitore}>
      {/* Intestazione: anagrafica e Priority Score del paziente */}
      <header className={styles.header}>
        <div>
          <h2 className={styles.nome}>{paziente.nome}</h2>
          <span className={styles.meta}>{paziente.eta} anni</span>
        </div>
        <div className={`${styles.scoreBox} ${styles[livello]}`}>
          <span className={styles.scoreLabel}>Priority Score</span>
          <span className={styles.scoreValore}>{score.toFixed(1)}</span>
        </div>
      </header>

      {/* 4 card statistiche dei domini WHOQOL */}
      <div className={styles.whoqolGriglia}>
        {DOMINI.map(({ chiave, etichetta }) => {
          const valore = paziente.whoqol[chiave];
          const colore = coloreDominio(valore);
          return (
            <article key={chiave} className={styles.whoqolCard}>
              <span className={styles.whoqolEtichetta}>{etichetta}</span>
              <span className={styles.whoqolValore}>{valore}</span>
              <div className={styles.whoqolBarraEsterna}>
                <div
                  className={styles.whoqolBarraInterna}
                  style={{ width: `${valore}%`, backgroundColor: colore }}
                />
              </div>
            </article>
          );
        })}
      </div>

      {/* Grafici: andamento sonno + intensità attività motoria */}
      <div className={styles.graficiGriglia}>
        <section className={styles.graficoCard}>
          <h3 className={styles.graficoTitolo}>Andamento del sonno</h3>
          <span className={styles.graficoSub}>Ore per giorno (ultima settimana)</span>
          <SleepBarChart dati={paziente.sonno} />
        </section>

        <section className={styles.graficoCard}>
          <h3 className={styles.graficoTitolo}>Attività motoria</h3>
          <span className={styles.graficoSub}>Minuti per intensità (giornata tipo)</span>
          <ActivityDonutChart dati={paziente.attivita} />
        </section>
      </div>
    </div>
  );
}
