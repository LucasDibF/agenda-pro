# Visão Geral da Arquitetura

## Componentes principais

- **Web (`agenda-web`)**: painel da profissional + booking público.
- **Mobile (`agenda-mobile`)**: app da profissional.
- **Supabase**: Auth, Postgres, RLS e SQL de regras.
- **Vercel**: deploy e execução da aplicação web.

## Fluxo de agendamento

1. Cliente agenda no link público.
2. Registro é criado em `appointments`.
3. Web aciona `/api/notify-booking`.
4. API consulta `profiles.push_token`.
5. API envia push via Expo.

## Arquivos-chave

- `agenda-web/supabase/sql/mvp_schema.sql`
- `agenda-web/app/api/notify-booking/route.ts`
- `agenda-web/components/public/booking-flow.tsx`
- `agenda-mobile/App.tsx`
