-- Agendamento publico via RPC (security definer) — nao depende de policy INSERT anon.
-- Rode no SQL Editor do Supabase (Production).

create or replace function public.create_public_appointment(
  p_professional_id uuid,
  p_service_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_appointment_date date,
  p_start_time time,
  p_end_time time,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.appointments (
    professional_id,
    service_id,
    customer_name,
    customer_phone,
    customer_email,
    appointment_date,
    start_time,
    end_time,
    notes,
    status
  )
  values (
    p_professional_id,
    p_service_id,
    trim(p_customer_name),
    trim(p_customer_phone),
    null,
    p_appointment_date,
    p_start_time,
    p_end_time,
    nullif(trim(coalesce(p_notes, '')), ''),
    'agendado'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_public_appointment(
  uuid, uuid, text, text, date, time, time, text
) from public;

grant execute on function public.create_public_appointment(
  uuid, uuid, text, text, date, time, time, text
) to anon, authenticated;

-- Opcional: policy INSERT anon (fallback se RPC nao existir ainda no deploy)
alter table public.appointments enable row level security;

drop policy if exists appointments_public_insert on public.appointments;
create policy appointments_public_insert
on public.appointments for insert
to anon, authenticated
with check (true);
