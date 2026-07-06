/*
 * Tabella dinamica dei pazienti, ordinata per Priority Score decrescente
 * (casi rossi in cima). Ogni riga è cliccabile e seleziona il paziente per
 * la Vista Dettaglio. L'indicatore a semaforo è reso con classi CSS.
 */

import type { Patient } from "@/types/patient";
import {
  calcolaPriorityScore,
  livelloSemaforoPaziente,
  ordinaPazienti,
} from "@/lib/priority";
import PatientBadge from "@/components/PatientBadge";
import styles from "./PatientTable.module.css";

interface PatientTableProps {
  pazienti: Patient[];
  selezionatoId?: string;
  onSelect: (paziente: Patient) => void;
}

export default function PatientTable({
  pazienti,
  selezionatoId,
  onSelect,
}: PatientTableProps) {
  // Ordina i pazienti per gravità: i più critici compaiono per primi.
  const pazientiOrdinati = ordinaPazienti(pazienti);

  return (
    <div className={styles.contenitore}>
      <table className={styles.tabella}>
        <thead>
          <tr>
            <th>Stato</th>
            <th>Paziente</th>
            <th>Età</th>
            <th>Salute Fisica</th>
            <th className={styles.scoreCol}>Priority Score</th>
          </tr>
        </thead>
        <tbody>
          {pazientiOrdinati.map((p) => {
            const score = calcolaPriorityScore(p);
            const livello = livelloSemaforoPaziente(p);
            const selezionato = p.id === selezionatoId;

            return (
              <tr
                key={p.id}
                className={`${styles.riga} ${
                  selezionato ? styles.rigaSelezionata : ""
                }`}
                onClick={() => onSelect(p)}
                aria-selected={selezionato}
              >
                <td>
                  <span
                    className={`${styles.semaforo} ${styles[livello]}`}
                    title={`Livello: ${livello}`}
                    aria-label={`Livello ${livello}`}
                  />
                </td>
                <td className={styles.nome}>{p.nome}</td>
                <td>{p.eta}</td>
                <td>
                  <div className={styles.barraEsterna}>
                    <div
                      className={styles.barraInterna}
                      style={{ width: `${p.whoqol.fisico}%` }}
                    />
                    <span className={styles.barraValore}>
                      {p.whoqol.fisico}
                    </span>
                  </div>
                </td>
                <td className={styles.scoreCol}>
                  <PatientBadge score={score} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
