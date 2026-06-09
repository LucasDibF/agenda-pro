-- Corrige: "new row violates row-level security policy for table appointments"
-- ao confirmar agendamento publico (/booking/...).
-- Rode no SQL Editor do Supabase (Production).

alter table public.appointments enable row level security;

drop policy if exists appointments_public_insert on public.appointments;
create policy appointments_public_insert
on public.appointments for insert
to anon, authenticated
with check (true);
