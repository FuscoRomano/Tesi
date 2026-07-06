# Migrazioni Supabase — Vytalia

Migrazioni SQL del database. **Da applicare solo sul progetto corretto del
Digital Twin** (`jovkvuhgfiikvwepqnnc`, quello referenziato in `.env.local`).

> ⚠️ Il server MCP Supabase di questa sessione era collegato a un progetto
> diverso ("Fiore Ebanisteria"), quindi la migrazione **non** è stata applicata
> automaticamente: va eseguita manualmente sul progetto giusto.

## Come applicare

**Opzione A — SQL Editor (rapida):**
apri il SQL Editor del progetto su Supabase e incolla il contenuto del file
`.sql`. Le policy usano `drop policy if exists`, quindi è ri-eseguibile.

**Opzione B — Supabase CLI:**
```bash
supabase link --project-ref jovkvuhgfiikvwepqnnc
supabase db push
```

## Contenuto

### `20260622120000_simulazioni_persistenza.sql`
- `public.profiles` — ruolo (`medico`/`paziente`) + anagrafica, collegato a
  `auth.users`. Trigger `on_auth_user_created` crea il profilo alla registrazione.
- `public.simulazioni` — header della simulazione + payload JSON completo (`dati`).
- `public.campioni` — serie temporale normalizzata dei parametri vitali.
- Funzione `public.e_medico()` (SECURITY DEFINER) per il check di ruolo.
- **RLS** su tutte le tabelle: Medico = vista globale; Paziente = solo i propri
  simulazioni (`paziente_id = auth.uid()`).

## Dopo l'applicazione
- Promuovere un utente a Medico:
  `update public.profiles set ruolo = 'medico' where id = '<uuid>';`
- Rigenerare i tipi TypeScript:
  `supabase gen types typescript --project-id jovkvuhgfiikvwepqnnc > src/types/database.ts`
