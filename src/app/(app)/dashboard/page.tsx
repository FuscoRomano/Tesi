"use client";

/*
 * Vista clinica (Dashboard Medico).
 * Ora configurata per usare Supabase come descritto nella tesi.
 */

import { useMemo, useState, useEffect } from "react";
import { ordinaPazienti } from "@/lib/priority";
import StatCards from "@/components/dashboard/StatCards";
import PatientTable from "@/components/dashboard/PatientTable";
import PatientDetail from "@/components/dashboard/PatientDetail";
import ActiveQuestionsTable from "@/components/dashboard/ActiveQuestionsTable";
import Paginazione from "@/components/dashboard/Paginazione";
import type { Patient } from "@/types/patient";
import { createClient } from "@/lib/supabase/client";
import styles from "./dashboard.module.css";
// importiamo i fittizi per fare un merge dei campi UI mancanti nel DB
import { pazientiFittizi } from "@/lib/mock-data"; 

const PER_PAGINA = 8;

export default function DashboardPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatients() {
      // Snippet della tesi per il fetch da supabase ordinato per physical_health_score
      const { data: dbPatients, error } = await supabase
        .from('pazienti')
        .select('*')
        .order('physical_health_score', { ascending: true });

      if (error) {
        console.error("Errore fetch pazienti:", error);
      } else if (dbPatients) {
        // Mappiamo il record del db per integrarlo con le interface UI
        const mappedPatients = dbPatients.map((dbP, index) => {
          // Prendi i dati UI extra (sonno, ecc) ciclando tra i fittizi come fallback
          const mockFallback = pazientiFittizi[index % pazientiFittizi.length];
          return {
            id: dbP.id,
            nome: `${dbP.nome} ${dbP.cognome}`,
            eta: dbP.data_nascita ? new Date().getFullYear() - new Date(dbP.data_nascita).getFullYear() : 50,
            whoqol: {
              fisico: (dbP.physical_health_score || 0) * 10,
              psicologico: dbP.stato_psichico || 0,
              relazioni: 50,
              ambiente: 50
            },
            statoFisico: 10 - (dbP.physical_health_score || 0),
            statoPsichico: 10 - ((dbP.stato_psichico || 0) / 10),
            trendPeggioramento: dbP.trend_peggioramento || 0,
            urgenzaDialogoAmica: dbP.urgenza_dialogo_amica || 0,
            sonno: mockFallback.sonno,
            attivita: mockFallback.attivita,
            domandeAttive: mockFallback.domandeAttive,
          } as Patient;
        });
        setPatients(mappedPatients);
      }
      setLoading(false);
    }
    
    fetchPatients();
  }, []);

  const pazientiOrdinati = useMemo(() => ordinaPazienti(patients), [patients]);
  
  // Paziente selezionato: di default il primo se esiste
  const [selezionato, setSelezionato] = useState<Patient | undefined>(undefined);

  // Sync selezionato quando i pazienti vengono caricati
  useEffect(() => {
    if (pazientiOrdinati.length > 0 && !selezionato) {
      setSelezionato(pazientiOrdinati[0]);
    }
  }, [pazientiOrdinati, selezionato]);

  const [query, setQuery] = useState("");
  const [pagina, setPagina] = useState(1);

  const filtrati = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pazientiOrdinati;
    return pazientiOrdinati.filter(
      (p) => p.nome.toLowerCase().includes(q) || String(p.eta).includes(q),
    );
  }, [pazientiOrdinati, query]);

  const totalePagine = Math.max(1, Math.ceil(filtrati.length / PER_PAGINA));
  const paginaCorrente = Math.min(pagina, totalePagine);
  const pagineVisibili = filtrati.slice(
    (paginaCorrente - 1) * PER_PAGINA,
    paginaCorrente * PER_PAGINA,
  );

  if (loading) {
    return <div className={styles.pagina}><p>Caricamento pazienti da Supabase...</p></div>;
  }

  return (
    <div className={styles.pagina}>
      <header className={styles.intestazione}>
        <h1 className={styles.titolo}>Vista Clinica</h1>
        <p className={styles.sottotitolo}>
          Monitoraggio Digital Twin dei pazienti — priorità basata sulla Salute Fisica
        </p>
      </header>

      <StatCards pazienti={patients} />

      <div className={styles.griglia}>
        <div className={styles.colonnaPazienti}>
          <div className={styles.barraRicerca}>
            <input
              type="search"
              className={styles.inputRicerca}
              placeholder="Cerca paziente per nome o età…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPagina(1);
              }}
              aria-label="Cerca paziente"
            />
            <span className={styles.contaRisultati}>
              {filtrati.length}{" "}
              {filtrati.length === 1 ? "paziente" : "pazienti"}
            </span>
          </div>

          {filtrati.length === 0 ? (
            <p className={styles.nessunRisultato}>
              Nessun paziente trovato per «{query}».
            </p>
          ) : (
            <>
              <PatientTable
                pazienti={pagineVisibili}
                selezionatoId={selezionato?.id}
                onSelect={setSelezionato}
              />
              <Paginazione
                paginaCorrente={paginaCorrente}
                totalePagine={totalePagine}
                onCambia={setPagina}
              />
            </>
          )}
        </div>

        {selezionato && <PatientDetail paziente={selezionato} />}
      </div>

      {selezionato && <ActiveQuestionsTable domande={selezionato.domandeAttive} />}
    </div>
  );
}
