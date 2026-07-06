/*
 * Tabella "Active questions": log degli interventi di fallback del robot
 * assistivo Amica. Mostra le domande generate quando il dialogo mattutino
 * richiede attenzione clinica, con badge di stato.
 */

import type { ActiveQuestion, ActiveQuestionStatus } from "@/types/patient";
import styles from "./ActiveQuestionsTable.module.css";

interface ActiveQuestionsTableProps {
  domande: ActiveQuestion[];
}

/** Etichette leggibili per lo stato dell'intervento. */
const ETICHETTE_STATO: Record<ActiveQuestionStatus, string> = {
  in_attesa: "In attesa",
  in_corso: "In corso",
  risolta: "Risolta",
};

/** Etichette leggibili dei domini WHOQOL. */
const ETICHETTE_DOMINIO: Record<string, string> = {
  fisico: "Fisico",
  psicologico: "Psicologico",
  relazioni: "Relazioni",
  ambiente: "Ambiente",
};

export default function ActiveQuestionsTable({
  domande,
}: ActiveQuestionsTableProps) {
  return (
    <section className={styles.contenitore}>
      <header className={styles.header}>
        <h3 className={styles.titolo}>Active questions</h3>
        <span className={styles.sottotitolo}>
          Interventi di fallback del robot assistivo Amica
        </span>
      </header>

      {domande.length === 0 ? (
        <p className={styles.vuoto}>Nessun intervento attivo per questo paziente.</p>
      ) : (
        <table className={styles.tabella}>
          <thead>
            <tr>
              <th>Orario</th>
              <th>Paziente</th>
              <th>Dominio</th>
              <th>Domanda</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {domande.map((d) => (
              <tr key={d.id}>
                <td className={styles.orario}>{d.timestamp}</td>
                <td>{d.paziente}</td>
                <td>{ETICHETTE_DOMINIO[d.dominio] ?? d.dominio}</td>
                <td className={styles.domanda}>{d.domanda}</td>
                <td>
                  <span className={`${styles.badge} ${styles[d.stato]}`}>
                    {ETICHETTE_STATO[d.stato]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
