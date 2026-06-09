-- ─── Branding (logo / nome) e imagens de serviço ──────────────────────────
-- Aplique no SQL Editor do Supabase (Production).
-- Idempotente: pode rodar várias vezes sem efeitos colaterais.

-- 1) Colunas novas ─────────────────────────────────────────────────────────

alter table public.services
  add column if not exists image_url text;

alter table public.profiles
  add column if not exists logo_url text;

alter table public.profiles
  add column if not exists business_name text;

-- 2) Buckets de Storage (públicos para leitura) ───────────────────────────

insert into storage.buckets (id, name, public)
values
  ('service-images', 'service-images', true),
  ('business-logos', 'business-logos', true)
on conflict (id) do update set public = true;

-- 3) Policies de Storage ──────────────────────────────────────────────────
-- Leitura pública para os 2 buckets (necessário pro link público).
-- Escrita só pelo dono — caminho TEM que começar com o user id do dono:
--   service-images/{user_id}/...
--   business-logos/{user_id}/...

drop policy if exists service_images_public_read on storage.objects;
create policy service_images_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'service-images');

drop policy if exists service_images_owner_insert on storage.objects;
create policy service_images_owner_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'service-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists service_images_owner_update on storage.objects;
create policy service_images_owner_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'service-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'service-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists service_images_owner_delete on storage.objects;
create policy service_images_owner_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'service-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists business_logos_public_read on storage.objects;
create policy business_logos_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'business-logos');

drop policy if exists business_logos_owner_insert on storage.objects;
create policy business_logos_owner_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists business_logos_owner_update on storage.objects;
create policy business_logos_owner_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists business_logos_owner_delete on storage.objects;
create policy business_logos_owner_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) RPC pública para ler branding sem precisar de SELECT em profiles ────
-- Retorna logo_url, business_name e full_name (fallback de exibição) só
-- para a profissional indicada. Security definer para passar pela RLS.

create or replace function public.get_public_profile_branding(
  p_professional_id uuid
)
returns table (
  logo_url      text,
  business_name text,
  full_name     text
)
language sql
security definer
set search_path = public
as $$
  select p.logo_url, p.business_name, p.full_name
  from public.profiles p
  where p.id = p_professional_id
  limit 1;
$$;

revoke all on function public.get_public_profile_branding(uuid) from public;
grant execute on function public.get_public_profile_branding(uuid) to anon, authenticated;
