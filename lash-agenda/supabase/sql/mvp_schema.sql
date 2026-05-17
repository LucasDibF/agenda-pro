create extension if not exists "pgcrypto";
create extension if not exists btree_gist;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type appointment_status as enum ('agendado', 'confirmado', 'cancelado', 'concluido');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  booking_code text unique,
  full_name text,
  phone text,
  role text not null default 'professional' check (role in ('professional')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists booking_code text;

alter table public.profiles
  add column if not exists push_token text;

update public.profiles
set booking_code = lower(substr(replace(id::text, '-', ''), 1, 12))
where booking_code is null;

alter table public.profiles
  alter column booking_code set not null;

create unique index if not exists uq_profiles_booking_code
  on public.profiles(booking_code);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, booking_code, full_name, phone, role)
  values (
    new.id,
    lower(substr(replace(new.id::text, '-', ''), 1, 12)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'professional'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text,
  timezone text not null default 'America/Sao_Paulo',
  booking_notice_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 600),
  price numeric(10,2) not null check (price >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_services_professional_id on public.services(professional_id);

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_interval_minutes integer not null default 0 check (slot_interval_minutes >= 0 and slot_interval_minutes <= 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create unique index if not exists uq_availability_professional_weekday_time
  on public.availability(professional_id, weekday, start_time, end_time);

create index if not exists idx_availability_professional_id on public.availability(professional_id);

create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create index if not exists idx_blocked_times_professional_id on public.blocked_times(professional_id);
create index if not exists idx_blocked_times_start_end on public.blocked_times(start_at, end_at);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status appointment_status not null default 'agendado',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists idx_appointments_professional_date
  on public.appointments(professional_id, appointment_date);

create index if not exists idx_appointments_service_id
  on public.appointments(service_id);

alter table public.appointments
  drop constraint if exists appointments_no_overlap;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    professional_id with =,
    tsrange(
      (appointment_date + start_time)::timestamp,
      (appointment_date + end_time)::timestamp,
      '[)'
    ) with &&
  )
  where (status in ('agendado', 'confirmado'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_business_settings_updated_at on public.business_settings;
create trigger trg_business_settings_updated_at
before update on public.business_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists trg_availability_updated_at on public.availability;
create trigger trg_availability_updated_at
before update on public.availability
for each row execute function public.set_updated_at();

drop trigger if exists trg_blocked_times_updated_at on public.blocked_times;
create trigger trg_blocked_times_updated_at
before update on public.blocked_times
for each row execute function public.set_updated_at();

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create or replace function public.validate_appointment()
returns trigger
language plpgsql
as $$
declare
  v_service_professional_id uuid;
  v_start_ts timestamp;
  v_end_ts timestamp;
begin
  select s.professional_id into v_service_professional_id
  from public.services s
  where s.id = new.service_id;

  if v_service_professional_id is null then
    raise exception 'Servico nao encontrado.';
  end if;

  if v_service_professional_id <> new.professional_id then
    raise exception 'Servico nao pertence a profissional informada.';
  end if;

  v_start_ts := (new.appointment_date + new.start_time)::timestamp;
  v_end_ts := (new.appointment_date + new.end_time)::timestamp;

  if exists (
    select 1
    from public.blocked_times bt
    where bt.professional_id = new.professional_id
      and tstzrange(bt.start_at, bt.end_at, '[)') &&
          tstzrange(v_start_ts::timestamptz, v_end_ts::timestamptz, '[)')
  ) then
    raise exception 'Horario esta bloqueado.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_appointment on public.appointments;
create trigger trg_validate_appointment
before insert or update on public.appointments
for each row execute function public.validate_appointment();

alter table public.profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.blocked_times enable row level security;
alter table public.appointments enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists business_settings_own_all on public.business_settings;
create policy business_settings_own_all
on public.business_settings for all
to authenticated
using (professional_id = auth.uid())
with check (professional_id = auth.uid());

drop policy if exists services_own_all on public.services;
create policy services_own_all
on public.services for all
to authenticated
using (professional_id = auth.uid())
with check (professional_id = auth.uid());

drop policy if exists services_public_read_active on public.services;
create policy services_public_read_active
on public.services for select
to anon, authenticated
using (is_active = true);

drop policy if exists availability_own_all on public.availability;
create policy availability_own_all
on public.availability for all
to authenticated
using (professional_id = auth.uid())
with check (professional_id = auth.uid());

drop policy if exists availability_public_read on public.availability;
create policy availability_public_read
on public.availability for select
to anon, authenticated
using (true);

drop policy if exists blocked_times_own_all on public.blocked_times;
create policy blocked_times_own_all
on public.blocked_times for all
to authenticated
using (professional_id = auth.uid())
with check (professional_id = auth.uid());

drop policy if exists blocked_times_public_read on public.blocked_times;
create policy blocked_times_public_read
on public.blocked_times for select
to anon, authenticated
using (true);

drop policy if exists appointments_own_select on public.appointments;
create policy appointments_own_select
on public.appointments for select
to authenticated
using (professional_id = auth.uid());

drop policy if exists appointments_own_update on public.appointments;
create policy appointments_own_update
on public.appointments for update
to authenticated
using (professional_id = auth.uid())
with check (professional_id = auth.uid());

drop policy if exists appointments_own_delete on public.appointments;
create policy appointments_own_delete
on public.appointments for delete
to authenticated
using (professional_id = auth.uid());

drop policy if exists appointments_public_insert on public.appointments;
create policy appointments_public_insert
on public.appointments for insert
to anon, authenticated
with check (true);

create or replace function public.get_booked_slots(
  p_professional_id uuid,
  p_date date
)
returns table (
  start_time time,
  end_time time
)
language sql
security definer
set search_path = public
as $$
  select a.start_time, a.end_time
  from public.appointments a
  where a.professional_id = p_professional_id
    and a.appointment_date = p_date
    and a.status in ('agendado', 'confirmado')
  order by a.start_time;
$$;

revoke all on function public.get_booked_slots(uuid, date) from public;
grant execute on function public.get_booked_slots(uuid, date) to anon, authenticated;

create or replace function public.resolve_professional_id(p_identifier text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional_id uuid;
begin
  if p_identifier is null or length(trim(p_identifier)) = 0 then
    return null;
  end if;

  if trim(p_identifier) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return trim(p_identifier)::uuid;
  end if;

  select p.id
    into v_professional_id
  from public.profiles p
  where p.booking_code = lower(trim(p_identifier))
  limit 1;

  return v_professional_id;
end;
$$;

-- URLs amigáveis /booking/nome: aplicar também supabase/sql/mvp_profiles_booking_slug.sql (coluna booking_slug + RPC atualizada).

revoke all on function public.resolve_professional_id(text) from public;
grant execute on function public.resolve_professional_id(text) to anon, authenticated;
