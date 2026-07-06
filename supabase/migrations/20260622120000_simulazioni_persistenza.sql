-- Migration: persistenza delle simulazioni cliniche e dei dataset del Digital Twin.
--
-- Crea il modello dati per salvare gli simulazioni generate dall'Information
-- Extraction (vedi src/app/api/extract) insieme ai loro campioni (serie
-- temporale dei parametri vitali), con Row Level Security distinta per i ruoli
-- Medico (vista globale) e Paziente (vista personale).
--
-- Eseguire SOLO sul progetto Supabase corretto del Digital Twin
-- (jovkvuhgfiikvwepqnnc). Applicazione:
--   supabase db push      (con Supabase CLI, progetto collegato)
--   oppure incollare nel SQL Editor del progetto corretto.
--
-- NB: tutte le tabelle hanno RLS abilitata; le policy sono separate per
-- operazione e per ruolo, come da best practice Supabase/Postgres.

/* ============================================================== */
/* 1. Ruoli utente e profili                                       */
/* ============================================================== */

-- Enum dei ruoli applicativi.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ruolo_utente') then
    create type public.ruolo_utente as enum ('medico', 'paziente');
  end if;
end$$;

-- Profilo applicativo collegato 1:1 all'utente di Supabase Auth.
-- Estende auth.users con il ruolo e i dati anagrafici minimi.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  ruolo       public.ruolo_utente not null default 'paziente',
  nome        text,
  creato_il   timestamptz not null default now()
);

comment on table public.profiles is
  'Profilo applicativo dell''utente: ruolo (medico/paziente) e anagrafica minima.';

-- Funzione helper: l'utente corrente è un Medico?
-- SECURITY DEFINER + search_path vuoto per evitare ricorsione RLS e
-- l'hijacking dello schema; STABLE perché non modifica dati.
create or replace function public.e_medico()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.ruolo = 'medico'
  );
$$;

-- Crea automaticamente il profilo alla registrazione di un nuovo utente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, new.raw_user_meta_data ->> 'nome')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* ============================================================== */
/* 2. Simulazioni cliniche                                              */
/* ============================================================== */

-- Header della simulazione generata + payload JSON completo (fonte di verità).
create table if not exists public.simulazioni (
  id              uuid primary key default gen_random_uuid(),
  creato_da       uuid not null references auth.users (id) on delete cascade,
  -- Paziente a cui la simulazione si riferisce (vista personale del paziente).
  paziente_id     uuid references public.profiles (id) on delete set null,
  descrizione     text not null,
  profilo_clinico text,
  durata_minuti   integer not null check (durata_minuti between 1 and 1440),
  sensori         text[] not null default '{}',
  -- JSON completo restituito da /api/extract (simulazione + persona + campioni):
  -- consente la riesportazione in CSV senza ricalcolo.
  dati            jsonb not null default '{}'::jsonb,
  creato_il       timestamptz not null default now()
);

comment on table public.simulazioni is
  'Simulazioni cliniche generati dall''Information Extraction, con payload JSON completo.';

create index if not exists simulazioni_paziente_id_idx on public.simulazioni (paziente_id);
create index if not exists simulazioni_creato_da_idx   on public.simulazioni (creato_da);

/* ============================================================== */
/* 3. Campioni (serie temporale normalizzata)                      */
/* ============================================================== */

-- Proiezione normalizzata e interrogabile dei campioni della simulazione:
-- una riga per minuto, una colonna per parametro vitale (NULL se il sensore
-- relativo non è stato simulato). Rispecchia il CSV prodotto da convert_to_csv.py.
create table if not exists public.campioni (
  id           bigint generated always as identity primary key,
  simulazione_id  uuid not null references public.simulazioni (id) on delete cascade,
  minuto       integer not null,
  rilevato_il  timestamptz not null,
  sys          numeric,
  dia          numeric,
  bpm          numeric,
  sat          numeric,
  glicemia     numeric,
  peso         numeric,
  unique (simulazione_id, minuto)
);

comment on table public.campioni is
  'Serie temporale normalizzata dei parametri vitali per ogni simulazione.';

create index if not exists campioni_simulazione_id_idx on public.campioni (simulazione_id);

/* ============================================================== */
/* 4. Row Level Security                                            */
/* ============================================================== */

alter table public.profiles enable row level security;
alter table public.simulazioni  enable row level security;
alter table public.campioni enable row level security;

/* --- profiles --- */

-- Lettura: il proprio profilo; il Medico vede tutti i profili.
drop policy if exists "profili_select_propri_o_medico" on public.profiles;
create policy "profili_select_propri_o_medico"
  on public.profiles for select to authenticated
  using ( id = (select auth.uid()) or public.e_medico() );

-- Aggiornamento: solo il proprio profilo (il ruolo resta gestito lato admin).
drop policy if exists "profili_update_propri" on public.profiles;
create policy "profili_update_propri"
  on public.profiles for update to authenticated
  using ( id = (select auth.uid()) )
  with check ( id = (select auth.uid()) );

/* --- simulazioni --- */

-- Lettura: il Medico vede tutti gli simulazioni (vista globale)...
drop policy if exists "simulazioni_select_medico" on public.simulazioni;
create policy "simulazioni_select_medico"
  on public.simulazioni for select to authenticated
  using ( public.e_medico() );

-- ...il Paziente vede solo gli simulazioni a lui associati (vista personale).
drop policy if exists "simulazioni_select_paziente" on public.simulazioni;
create policy "simulazioni_select_paziente"
  on public.simulazioni for select to authenticated
  using ( paziente_id = (select auth.uid()) );

-- Scrittura riservata al Medico (autore = utente corrente).
drop policy if exists "simulazioni_insert_medico" on public.simulazioni;
create policy "simulazioni_insert_medico"
  on public.simulazioni for insert to authenticated
  with check ( public.e_medico() and creato_da = (select auth.uid()) );

drop policy if exists "simulazioni_update_medico" on public.simulazioni;
create policy "simulazioni_update_medico"
  on public.simulazioni for update to authenticated
  using ( public.e_medico() )
  with check ( public.e_medico() );

drop policy if exists "simulazioni_delete_medico" on public.simulazioni;
create policy "simulazioni_delete_medico"
  on public.simulazioni for delete to authenticated
  using ( public.e_medico() );

/* --- campioni --- */

-- Lettura: ereditata dalla simulazione padre (Medico tutti, Paziente i propri).
drop policy if exists "campioni_select_ereditato" on public.campioni;
create policy "campioni_select_ereditato"
  on public.campioni for select to authenticated
  using (
    exists (
      select 1 from public.simulazioni s
      where s.id = campioni.simulazione_id
        and ( public.e_medico() or s.paziente_id = (select auth.uid()) )
    )
  );

-- Scrittura riservata al Medico.
drop policy if exists "campioni_insert_medico" on public.campioni;
create policy "campioni_insert_medico"
  on public.campioni for insert to authenticated
  with check ( public.e_medico() );

drop policy if exists "campioni_delete_medico" on public.campioni;
create policy "campioni_delete_medico"
  on public.campioni for delete to authenticated
  using ( public.e_medico() );
