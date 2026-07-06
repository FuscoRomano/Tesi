import { elencaMieiPazienti } from "./actions";
import PazientiManager from "./PazientiManager";
import styles from "./pazienti.module.css";

/*
 * Pagina Pazienti (Server Component).
 * Carica l'elenco dei pazienti del medico loggato (filtrato dalla RLS) e lo
 * passa al gestore client, che fornisce il form di inserimento manuale.
 */
export default async function PazientiPage() {
  const { pazienti, error } = await elencaMieiPazienti();

  return (
    <section className={styles.pagina}>
      <header className={styles.intestazione}>
        <h1 className={styles.titolo}>Pazienti</h1>
        <p className={styles.sottotitolo}>
          Gestisci i pazienti che hai preso in carico. Sono entità dati visibili
          solo a te.
        </p>
      </header>

      {error ? (
        <p role="alert" className={styles.errore}>
          Impossibile caricare i pazienti: {error}
        </p>
      ) : (
        <PazientiManager pazientiIniziali={pazienti ?? []} />
      )}
    </section>
  );
}
