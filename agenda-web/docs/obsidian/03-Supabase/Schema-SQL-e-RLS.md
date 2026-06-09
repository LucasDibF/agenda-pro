# Supabase: Schema, SQL e RLS

Arquivo principal:

- `agenda-web/supabase/sql/mvp_schema.sql`

## SQL obrigatório para push

```sql
alter table public.profiles
add column if not exists push_token text;
```

## Validação rápida

```sql
select id, full_name, push_token
from public.profiles
order by created_at desc
limit 20;
```

## Tabelas principais

- `profiles`
- `services`
- `availability`
- `blocked_times`
- `appointments`

## Regras importantes

- `appointments.service_id` usa `on delete restrict`.
- Não pode sobrepor horários ativos (`agendado`/`confirmado`).
- RLS protege os dados por profissional.
