-- Aggiunge le colonne necessarie per supportare la logica della tesi
alter table public.pazienti 
add column if not exists physical_health_score numeric default 0,
add column if not exists trend_peggioramento numeric default 0,
add column if not exists stato_psichico numeric default 0,
add column if not exists urgenza_dialogo_amica numeric default 0;
