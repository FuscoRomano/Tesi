-- Fix definitivo: l'INSERT in `simulazioni` falliva con
--   "new row violates row-level security policy for table simulazioni"
-- sia per il Paziente (negato per design) sia per il Medico.
--
-- Causa per il Medico: la policy `simulazioni_insert_medico` richiede
-- `public.e_medico() = true`, cioè `profiles.ruolo = 'medico'`. Ma il trigger
-- originale (migration 20260622120000) creava OGNI profilo con `ruolo='paziente'`
-- ignorando il `ruolo` salvato nei metadata in fase di registrazione. Quindi
-- anche l'utente registrato come Medico aveva `ruolo='paziente'` nel profilo
-- e `e_medico()` restituiva false.
--
-- Questo script: (1) corregge il trigger, (2) fa il backfill dei profili
-- esistenti dai metadata, (3) fornisce diagnostica e promozione manuale.
--
-- ESEGUIRE NEL SQL EDITOR DEL PROGETTO CORRETTO (jovkvuhgfiikvwepqnnc).
-- È idempotente: si può rieseguire senza effetti collaterali.

/* ============================================================== */
/* 1. Trigger corretto: legge il ruolo dai metadata utente         */
/* ============================================================== */
-- I metadata salvano "Medico"/"Paziente" (maiuscola); l'enum è lowercase:
-- si usa lower() + cast esplicito. Il nome arriva da nome_completo o nome.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, ruolo)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nome_completo',
      new.raw_user_meta_data ->> 'nome'
    ),
    lower(coalesce(new.raw_user_meta_data ->> 'ruolo', 'paziente'))::public.ruolo_utente
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

/* ============================================================== */
/* 2. Backfill: allinea il ruolo dei profili già esistenti          */
/* ============================================================== */
-- Aggiorna solo le righe dove il profilo è disallineato rispetto ai metadata.
update public.profiles p
set ruolo = lower(u.raw_user_meta_data ->> 'ruolo')::public.ruolo_utente
from auth.users u
where p.id = u.id
  and u.raw_user_meta_data ->> 'ruolo' is not null
  and lower(u.raw_user_meta_data ->> 'ruolo') <> p.ruolo::text;

/* ============================================================== */
/* 3. Diagnostica: controlla i ruoli effettivi nei profili          */
/* ============================================================== */
-- Esegui SOLO questa SELECT per vedere lo stato attuale di ogni utente:
--
--   select u.email,
--          u.raw_user_meta_data ->> 'ruolo' as ruolo_metadata,
--          p.ruolo                          as ruolo_profilo
--   from public.profiles p
--   join auth.users u on u.id = p.id
--   order by u.email;

/* ============================================================== */
/* 4. Promozione manuale (fallback)                                 */
/* ============================================================== */
-- Se dopo il backfill il tuo utente Medico NON risulta 'medico' (es. registrato
-- senza il campo 'ruolo' nei metadata), promuovilo a mano sostituendo l'email:
--
--   update public.profiles
--   set ruolo = 'medico'
--   where id = (select id from auth.users where email = 'EMAIL_DEL_MEDICO');
