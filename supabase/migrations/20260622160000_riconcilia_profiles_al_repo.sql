-- Riconciliazione di public.profiles al design canonico del repo/app.
--
-- Contesto: collegando finalmente l'MCP al progetto corretto (Tirocinio,
-- jovkvuhgfiikvwepqnnc) si è scoperto che la tabella `profiles` live era
-- divergente dal design del repo e dell'app: id surrogate (gen_random_uuid)
-- con colonna `user_id` separata (NOT NULL senza default), più `cognome`,
-- `created_at`, `updated_at`, e un secondo set di policy RLS basate su user_id.
--
-- Effetti del disallineamento:
--   * Registrazione rotta: il trigger handle_new_user inserisce solo
--     (id, nome, ruolo), ma `user_id` era NOT NULL senza default -> ogni
--     signup falliva.
--   * Policy RLS duplicate/in conflitto (alcune su id, altre su user_id).
--
-- Questa migration riporta `profiles` al design canonico:
--   id = auth.users.id (PK + FK), ruolo, nome (nullable), creato_il.
-- Preserva i profili esistenti: id <- user_id e nome <- "nome cognome".
-- (simulazioni/campioni sono vuoti: nessuna FK da gestire.)
--
-- Applicata via MCP Supabase (apply_migration) sul progetto jovkvuhgfiikvwepqnnc.

-- 1. Rimuovi trigger/funzione updated_at (non previsti dal design canonico).
drop trigger if exists profiles_aggiorna_updated_at on public.profiles;
drop function if exists public.aggiorna_updated_at();

-- 2. Rimuovi le policy duplicate basate su user_id (restano quelle del repo, su id).
drop policy if exists "profili_select_proprio" on public.profiles;
drop policy if exists "profili_insert_proprio" on public.profiles;
drop policy if exists "profili_update_proprio" on public.profiles;

-- 3. Preserva i dati prima di rimodellare:
--    nome completo = "nome cognome" (come fa il trigger del repo con nome_completo)...
update public.profiles
set nome = trim(both ' ' from coalesce(nome, '') || ' ' || coalesce(cognome, ''))
where cognome is not null and cognome <> '';

--    ...e allinea la PK all'identità Auth (id = user_id = auth.users.id).
update public.profiles set id = user_id where id <> user_id;

-- 4. Riallinea le colonne al design del repo.
alter table public.profiles drop column if exists user_id;
alter table public.profiles drop column if exists cognome;
alter table public.profiles drop column if exists updated_at;
alter table public.profiles rename column created_at to creato_il;
alter table public.profiles alter column nome drop not null;
alter table public.profiles alter column nome drop default;

-- 5. id deve coincidere con auth.users.id (no default surrogate, FK con cascade).
alter table public.profiles alter column id drop default;
alter table public.profiles
  add constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade;

-- 6. Igiene sicurezza: la funzione trigger non va esposta come RPC.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
