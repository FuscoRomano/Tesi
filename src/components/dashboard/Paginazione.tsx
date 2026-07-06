"use client";

import styles from "./Paginazione.module.css";

/*
 * Barra di paginazione stile Google: « Prec · 1 2 3 … · Succ ».
 * Componente presentazionale: riceve la pagina corrente e il totale, e notifica
 * il cambio pagina al genitore. Mostra una finestra di numeri con ellissi così
 * resta leggibile anche con molte pagine.
 */

interface PaginazioneProps {
  paginaCorrente: number;
  totalePagine: number;
  onCambia: (pagina: number) => void;
}

/**
 * Calcola i numeri di pagina da mostrare attorno a quella corrente.
 * Restituisce numeri e marcatori di ellissi ("…") per i salti.
 * Esempi: totale 4 -> [1,2,3,4]; corrente 6 su 12 -> [1,"…",5,6,7,"…",12].
 */
function costruisciPagine(
  corrente: number,
  totale: number,
): (number | "…")[] {
  // Con poche pagine le mostriamo tutte.
  if (totale <= 7) {
    return Array.from({ length: totale }, (_, i) => i + 1);
  }

  const pagine: (number | "…")[] = [1];
  const inizio = Math.max(2, corrente - 1);
  const fine = Math.min(totale - 1, corrente + 1);

  if (inizio > 2) pagine.push("…");
  for (let p = inizio; p <= fine; p++) pagine.push(p);
  if (fine < totale - 1) pagine.push("…");

  pagine.push(totale);
  return pagine;
}

export default function Paginazione({
  paginaCorrente,
  totalePagine,
  onCambia,
}: PaginazioneProps) {
  // Niente da paginare: la barra non serve.
  if (totalePagine <= 1) return null;

  const pagine = costruisciPagine(paginaCorrente, totalePagine);

  return (
    <nav className={styles.barra} aria-label="Paginazione pazienti">
      <button
        type="button"
        className={styles.bottone}
        onClick={() => onCambia(paginaCorrente - 1)}
        disabled={paginaCorrente === 1}
        aria-label="Pagina precedente"
      >
        ‹ Prec
      </button>

      {pagine.map((p, i) =>
        p === "…" ? (
          <span key={`ellissi-${i}`} className={styles.ellissi} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`${styles.bottone} ${
              p === paginaCorrente ? styles.bottoneAttivo : ""
            }`}
            onClick={() => onCambia(p)}
            aria-current={p === paginaCorrente ? "page" : undefined}
            aria-label={`Pagina ${p}`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className={styles.bottone}
        onClick={() => onCambia(paginaCorrente + 1)}
        disabled={paginaCorrente === totalePagine}
        aria-label="Pagina successiva"
      >
        Succ ›
      </button>
    </nav>
  );
}
