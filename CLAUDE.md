# Contesto del Progetto: Vytalia

## Obiettivo Principale
Sviluppare una piattaforma web per il monitoraggio dello stato di salute dei pazienti attraverso un "Digital Twin". Il sistema integra dati da dispositivi elettromedicali, sensori "Amica" e il dialogo basato sui 4 domini WHOQOL (Fisico, Psicologico, Relazioni Sociali, Ambiente).

## Regole Architetturali e Tecnologiche
- **Stack:** Next.js (App Router), React, Tailwind CSS.
- **Backend:** Supabase (Auth, Database, RLS).
- **Ruoli:** L'unico ruolo presente è il ruolo del medico.

## Dispositivi Elettromedicali Supportati
1. **Sfigmomanometro Digitale (Jumper JPDHA121):** Monitoraggio SYS, DIA, BPM.
2. **Holter Glicemico (Yuwell Anytime):** Report PDF (14 gg) e export CSV.
3. **Saturimetro da dito (Jumper JPD500F):** Monitoraggio SAT, BPM.
4. **Saturimetro palmare (Move OYX100):** Monitoraggio SAT, BPM.
5. **Bilancia Bioimpedenziometrica (Omron VIVA):** Peso e composizione corporea.
6. **Holter Cardiaco (Lumed EuroHolter):** Referto PDF.
7. **Cardiofrequenzimetro (Polar H10):** Monitoraggio BPM.
8. **BioBeat Patch (Monitoraggio Parametri Vitali):** Report PDF e dati machine readable.
9. **BTS BaioBit (Training e Riabilitazione):** Report PDF, CSV esercitazione e test.
10. **Treadmill (Runner srl RUN2011/TJO-PC):** CSV esercizio (basato su template).

## Requisiti della Dashboard (Vista Medico)
1. **Indicatori:** 3 card in alto con conteggio pazienti per colore (Rosso, Giallo, Verde). Priorità basata sul dominio "Salute Fisica".
2. **Lista Pazienti:** Ordinamento automatico con i casi "Rossi" in cima.
3. **Dettaglio WHOQOL:** Visualizzazione dello stato di salute suddiviso nei 4 domini per ogni paziente.
4. **Categorizzazione Dati:** Distinguere chiaramente tra dati da sensori fisici e dati da dialogo mattutino (sottoset QoL).

## Linee Guida di Sviluppo
- **Documentazione:** Inserisci commenti chiari nel codice in lingua italiana.
- **Utilizzo Skill:** Applica le best practice definite in `.agents/skills/` (frontend-design, supabase, supabase-postgres-best-practices). Per la creazione generale del frontend, utilizza obbligatoriamente la skill frontend-design.
- **Tool MCP:** Utilizza i server configurati in `.mcp.json` (Postgres e GitHub) per agire direttamente sul database e sulla repository.
- **Memoria Progetto:** Aggiorna `.claude/agent-memory` per tracciare le logiche di calcolo della priorità e le configurazioni hardware.