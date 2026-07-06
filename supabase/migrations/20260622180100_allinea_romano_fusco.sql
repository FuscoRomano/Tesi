-- Allineamento dell'utente 'Romano Fusco' alla nuova struttura (solo Medici).
--
-- Dopo il refactor del dominio non esistono più ruoli: ogni utente autenticato
-- è un Medico con pieno accesso operativo ai propri dati (RLS su auth.uid()).
-- Questo script è idempotente e garantisce che il profilo Medico collegato
-- all'utente Auth di Romano Fusco esista e sia corretto.
--
-- Eseguito via MCP (execute_sql) sul progetto jovkvuhgfiikvwepqnnc.

insert into public.profiles (id, nome, cognome)
select u.id, 'Romano', 'Fusco'
from auth.users u
where u.email = 'romano.fusco1@gmail.com'
on conflict (id) do update
  set nome    = excluded.nome,
      cognome = excluded.cognome;
