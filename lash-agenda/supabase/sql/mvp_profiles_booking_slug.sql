-- Slug público legível na URL (/booking/nome-da-profissional), derivado de full_name.
-- Mantém booking_code e UUID funcionando em resolve_professional_id.
-- Rode no SQL Editor do Supabase após backup.

alter table public.profiles
  add column if not exists booking_slug text;

create unique index if not exists uq_profiles_booking_slug
  on public.profiles(booking_slug);

create or replace function public.profiles_set_booking_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn text;
  base text;
  cand text;
  i int := 0;
begin
  fn := trim(coalesce(new.full_name, ''));

  base := lower(fn);
  base := translate(
    base,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'
  );
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '-{2,}', '-', 'g');
  base := trim(both '-' from base);

  if length(base) < 3 then
    base := lower(substr(replace(new.id::text, '-', ''), 1, 10));
  end if;

  cand := base;
  loop
    exit when not exists (
      select 1
      from public.profiles p
      where p.booking_slug = cand
        and p.id is distinct from new.id
    );
    i := i + 1;
    cand := base || '-' || i::text;
  end loop;

  new.booking_slug := cand;
  return new;
end;
$$;

drop trigger if exists trg_profiles_booking_slug on public.profiles;

create trigger trg_profiles_booking_slug
before insert or update of full_name on public.profiles
for each row
execute procedure public.profiles_set_booking_slug();

-- Preenche slugs das linhas já existentes (dispara o trigger).
update public.profiles
set full_name = trim(coalesce(full_name, ''));

alter table public.profiles
  alter column booking_slug set not null;

create or replace function public.resolve_professional_id(p_identifier text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_professional_id uuid;
  v_trim text := lower(trim(p_identifier));
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
  where p.booking_slug = v_trim
  limit 1;

  if v_professional_id is not null then
    return v_professional_id;
  end if;

  select p.id
    into v_professional_id
  from public.profiles p
  where p.booking_code = v_trim
  limit 1;

  return v_professional_id;
end;
$$;

revoke all on function public.resolve_professional_id(text) from public;
grant execute on function public.resolve_professional_id(text) to anon, authenticated;
