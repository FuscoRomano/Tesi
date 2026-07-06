-- Aggiunge cognome e telefono a public.profiles per la pagina "dati utente".
-- email e password restano gestiti da Supabase Auth (auth.users), modificabili
-- via supabase.auth.updateUser(). telefono è testo libero (non OTP).
--
-- Applicata via MCP Supabase (apply_migration) sul progetto jovkvuhgfiikvwepqnnc.

alter table public.profiles add column if not exists cognome  text;
alter table public.profiles add column if not exists telefono text;

comment on column public.profiles.cognome  is 'Cognome dell''utente (anagrafica).';
comment on column public.profiles.telefono is 'Recapito telefonico (testo libero, non usato per OTP).';

-- Backfill: separa il "nome completo" esistente in nome + cognome (primo spazio).
-- In una singola UPDATE le espressioni SET usano i valori OLD della riga,
-- quindi entrambe leggono il nome originale.
update public.profiles
set nome    = split_part(nome, ' ', 1),
    cognome = nullif(trim(substr(nome, length(split_part(nome, ' ', 1)) + 1)), '')
where cognome is null and nome like '% %';

-- Trigger: alla registrazione salva nome e cognome separati dai metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, cognome, ruolo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'nome_completo'),
    new.raw_user_meta_data ->> 'cognome',
    lower(coalesce(new.raw_user_meta_data ->> 'ruolo', 'paziente'))::public.ruolo_utente
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- La funzione trigger non va esposta come RPC (ricreandola ripristina il grant di default).
revoke execute on function public.handle_new_user() from anon, authenticated, public;
