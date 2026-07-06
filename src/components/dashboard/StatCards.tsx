/*
 * Tre card riepilogative in alto: conteggio pazienti per livello del
 * semaforo (Rosso, Giallo, Verde). La priorità è basata sul dominio
 * "Salute Fisica" tramite il Priority Score.
 */

import type { Patient } from "@/types/patient";
import { livelloSemaforoPaziente } from "@/lib/priority";
import styles from "./StatCards.module.css";

interface StatCardsProps {
  pazienti: Patient[];
}

export default function StatCards({ pazienti }: StatCardsProps) {
  // Conta i pazienti per livello semaforo a partire dal Priority Score.
  const conteggi = pazienti.reduce(
    (acc, p) => {
      acc[livelloSemaforoPaziente(p)] += 1;
      return acc;
    },
    { rosso: 0, giallo: 0, verde: 0 },
  );

  const card = [
    {
      livello: "rosso" as const,
      etichetta: "Casi critici",
      descrizione: "Intervento prioritario",
      valore: conteggi.rosso,
    },
    {
      livello: "giallo" as const,
      etichetta: "Da monitorare",
      descrizione: "Osservazione ravvicinata",
      valore: conteggi.giallo,
    },
    {
      livello: "verde" as const,
      etichetta: "Stabili",
      descrizione: "Parametri nella norma",
      valore: conteggi.verde,
    },
  ];

  return (
    <div className={styles.griglia}>
      {card.map((c) => (
        <article
          key={c.livello}
          className={`${styles.card} ${styles[c.livello]}`}
        >
          <div className={styles.intestazione}>
            <span className={styles.pallino} aria-hidden="true" />
            <span className={styles.etichetta}>{c.etichetta}</span>
          </div>
          <span className={styles.valore}>{c.valore}</span>
          <span className={styles.descrizione}>{c.descrizione}</span>
        </article>
      ))}
    </div>
  );
}
