-- Intervalo diário (almoco/pausa) por profissional: não aparece como slot público nem em reagendamento.
-- Rode no SQL Editor do Supabase ou via CLI após backup.

alter table public.profiles
  add column if not exists break_start_time time;

alter table public.profiles
  add column if not exists break_end_time time;

alter table public.profiles
  drop constraint if exists profiles_break_times_valid;

alter table public.profiles
  add constraint profiles_break_times_valid check (
    (break_start_time is null and break_end_time is null)
    or (
      break_start_time is not null
      and break_end_time is not null
      and break_end_time > break_start_time
    )
  );

-- Leitura segura para agendamento público (anon) sem expor outras colunas de profiles.
create or replace function public.get_professional_daily_break(p_professional_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'break_start_time', p.break_start_time,
    'break_end_time', p.break_end_time
  )
  from public.profiles p
  where p.id = p_professional_id;
$$;

grant execute on function public.get_professional_daily_break(uuid) to anon, authenticated;
