import type { Patient, SemaforoLevel } from "@/types/patient";

export function calcolaPriorityScore(p: Patient): number {
  const score = 
    (p.statoFisico * 0.6) +
    (p.statoPsichico * 0.2) +
    (p.trendPeggioramento * 1.5) +
    (p.urgenzaDialogoAmica * 1.0);
  return score;
}

export function livelloSemaforo(score: number): "rosso" | "giallo" | "verde" {
  if (score >= 18) return "rosso";
  if (score >= 10) return "giallo";
  return "verde";
}

/** 
 * Scorciatoia per mantenere compatibilità con alcuni componenti esistenti
 * che si aspettano la firma di livelloSemaforoPaziente.
 */
export function livelloSemaforoPaziente(p: Patient): SemaforoLevel {
  return livelloSemaforo(calcolaPriorityScore(p));
}

export function ordinaPazienti(pazienti: Patient[]): Patient[] {
  // Ordine decrescente: i punteggi più alti (più critici) per primi
  return [...pazienti].sort(
    (a, b) => calcolaPriorityScore(b) - calcolaPriorityScore(a)
  );
}
