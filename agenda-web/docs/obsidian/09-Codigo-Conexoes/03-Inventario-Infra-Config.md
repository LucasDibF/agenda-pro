# Inventario de Infra e Configuracoes

## Web

- `agenda-web/app/api/notify-booking/route.ts` (backend server-side)
- `agenda-web/supabase/sql/mvp_schema.sql` (schema, triggers, RLS)
- `agenda-web/next.config.ts` (config Next.js)
- `agenda-web/package.json` (scripts e deps)
- `agenda-web/.env.local` (nao versionado)

## Mobile

- `agenda-mobile/src/lib/supabase.ts` (cliente Supabase)
- `agenda-mobile/app.json` (config Expo)
- `agenda-mobile/eas.json` (build profiles EAS)
- `agenda-mobile/package.json` (scripts e deps)
- `agenda-mobile/.env` (nao versionado)
- `agenda-mobile/.env.example` (template de env)

## Deploy

- Vercel (web)
- Supabase (db/auth)
- Expo (mobile runtime/build)
