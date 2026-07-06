-- ============================================================
-- Refactor del dominio: l'unico attore è il Medico.
-- I pazienti diventano entità DATI (tabella pazienti) gestite dai medici.
-- Si elimina ogni nozione di ruolo: ogni utente autenticato è un Medico.
--
-- Applicata via MCP Supabase (apply_migration) sul progetto jovkvuhgfiikvwepqnnc.
-- ============================================================

-- 1. Rimuovi le policy che dipendono da e_medico()/ruolo (ricreate sotto).
drop policy if exists "profili_select_propri_o_medico" on public.profiles;
drop policy if exists "profili_update_propri"          on public.profiles;

drop policy if exists "simulazioni_select_medico"   on public.simulazioni;
drop policy if exists "simulazioni_select_paziente" on public.simulazioni;
drop policy if exists "simulazioni_insert_medico"   on public.simulazioni;
drop policy if exists "simulazioni_update_medico"   on public.simulazioni;
drop policy if exists "simulazioni_delete_medico"   on public.simulazioni;

drop policy if exists "campioni_select_ereditato" on public.campioni;
drop policy if exists "campioni_insert_medico"    on public.campioni;
drop policy if exists "campioni_delete_medico"    on public.campioni;

-- 2. Elimina la logica dei ruoli.
--    Il trigger va ricreato senza ruolo PRIMA di togliere enum/colonna.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, cognome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'nome_completo'),
    new.raw_user_meta_data ->> 'cognome'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

drop function if exists public.e_medico();
alter table public.profiles drop column if exists ruolo;
drop type if exists public.ruolo_utente;

-- 3. Nuova tabella pazienti (entità dati prese in carico dal Medico).
create table if not exists public.pazienti (
  id            uuid primary key default gen_random_uuid(),
  medico_id     uuid not null references public.profiles (id) on delete cascade,
  nome          text not null,
  cognome       text not null,
  data_nascita  date,
  creato_il     timestamptz not null default now()
);
comment on table public.pazienti is
  'Pazienti come entità dati, presi in carico da un Medico (medico_id -> profiles).';
create index if not exists pazienti_medico_id_idx on public.pazienti (medico_id);
alter table public.pazienti enable row level security;

-- 4. simulazioni.paziente_id ora referenzia pazienti (prima profiles). 0 righe: sicuro.
alter table public.simulazioni drop constraint if exists simulazioni_paziente_id_fkey;
alter table public.simulazioni
  add constraint simulazioni_paziente_id_fkey
  foreign key (paziente_id) references public.pazienti (id) on delete set null;

-- ============================================================
-- 5. RLS: il Medico autenticato ha pieno CRUD sui PROPRI dati.
-- ============================================================

-- profiles: solo il proprio profilo (id = auth.uid()).
create policy "profili_select_proprio" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profili_insert_proprio" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profili_update_proprio" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profili_delete_proprio" on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

-- pazienti: solo i propri (medico_id = auth.uid()).
create policy "pazienti_select_propri" on public.pazienti
  for select to authenticated using (medico_id = (select auth.uid()));
create policy "pazienti_insert_propri" on public.pazienti
  for insert to authenticated with check (medico_id = (select auth.uid()));
create policy "pazienti_update_propri" on public.pazienti
  for update to authenticated using (medico_id = (select auth.uid())) with check (medico_id = (select auth.uid()));
create policy "pazienti_delete_propri" on public.pazienti
  for delete to authenticated using (medico_id = (select auth.uid()));

-- simulazioni: solo quelli creati dal medico (creato_da = auth.uid()).
create policy "simulazioni_select_propri" on public.simulazioni
  for select to authenticated using (creato_da = (select auth.uid()));
create policy "simulazioni_insert_propri" on public.simulazioni
  for insert to authenticated with check (creato_da = (select auth.uid()));
create policy "simulazioni_update_propri" on public.simulazioni
  for update to authenticated using (creato_da = (select auth.uid())) with check (creato_da = (select auth.uid()));
create policy "simulazioni_delete_propri" on public.simulazioni
  for delete to authenticated using (creato_da = (select auth.uid()));

-- campioni: ereditano l'accesso dalla simulazione padre (creato_da = auth.uid()).
create policy "campioni_select_ereditato" on public.campioni
  for select to authenticated using (
    exists (select 1 from public.simulazioni s where s.id = campioni.simulazione_id and s.creato_da = (select auth.uid())));
create policy "campioni_insert_ereditato" on public.campioni
  for insert to authenticated with check (
    exists (select 1 from public.simulazioni s where s.id = campioni.simulazione_id and s.creato_da = (select auth.uid())));
create policy "campioni_update_ereditato" on public.campioni
  for update to authenticated using (
    exists (select 1 from public.simulazioni s where s.id = campioni.simulazione_id and s.creato_da = (select auth.uid())))
  with check (
    exists (select 1 from public.simulazioni s where s.id = campioni.simulazione_id and s.creato_da = (select auth.uid())));
create policy "campioni_delete_ereditato" on public.campioni
  for delete to authenticated using (
    exists (select 1 from public.simulazioni s where s.id = campioni.simulazione_id and s.creato_da = (select auth.uid())));
