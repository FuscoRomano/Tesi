-- Fix: il trigger handle_new_user ora legge il ruolo dai metadata utente.
--
-- Il bug: la versione precedente ignorava raw_user_meta_data ->> 'ruolo'
-- e creava sempre il profilo con il valore di default 'paziente', rendendo
-- impossibile l'INSERT in `simulazioni` per gli utenti registrati come Medico
-- (la policy simulazioni_insert_medico richiede e_medico() = true).
--
-- Applicare nel SQL Editor del progetto jovkvuhgfiikvwepqnnc.

-- 1. Aggiorna il trigger per leggere il ruolo dai metadata.
--    I metadata salvano "Medico"/"Paziente" (maiuscola), l'enum è lowercase:
--    si usa lower() + cast esplicito per mappare correttamente.
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

-- 2. Backfill: sincronizza il ruolo nei profili già esistenti
--    che hanno il valore corretto in raw_user_meta_data ma 'paziente' nel profilo.
--    Sicuro: aggiorna solo le righe dove c'è effettivamente un disallineamento.
update public.profiles p
set ruolo = lower(u.raw_user_meta_data ->> 'ruolo')::public.ruolo_utente
from auth.users u
where p.id = u.id
  and u.raw_user_meta_data ->> 'ruolo' is not null
  and lower(u.raw_user_meta_data ->> 'ruolo') <> p.ruolo::text;
