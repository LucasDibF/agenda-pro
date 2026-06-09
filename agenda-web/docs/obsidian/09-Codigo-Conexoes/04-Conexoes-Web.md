# Conexoes de Codigo - Web

## Rotas -> Componentes

- `app/login/page.tsx` -> `components/auth/login-form.tsx`
- `app/(public)/booking/page.tsx` -> `components/public/booking-entry.tsx`
- `app/(public)/booking/[professionalId]/page.tsx` -> `components/public/booking-flow.tsx`
- `app/(dashboard)/professional/page.tsx` -> `components/professional/dashboard-overview.tsx`
- `app/(dashboard)/professional/services/page.tsx` -> `components/professional/services-manager.tsx`
- `app/(dashboard)/professional/calendar/page.tsx` ->  
  - `components/professional/appointments-manager.tsx`  
  - `components/professional/availability-manager.tsx`  
  - `components/professional/blocked-times-manager.tsx`

## Layout de dashboard -> Auth

- `app/(dashboard)/professional/layout.tsx` ->
  - `components/auth/protected-route.tsx`
  - `components/auth/sign-out-button.tsx`

## Componentes -> Dependencias internas

- `components/public/booking-flow.tsx` ->
  - `components/public/booking-calendar.tsx`
  - `lib/supabase/client.ts`
- `components/public/booking-entry.tsx` -> `lib/supabase/client.ts`
- `components/auth/login-form.tsx` -> `lib/supabase/client.ts`
- `components/auth/protected-route.tsx` -> `lib/supabase/client.ts`
- `components/auth/sign-out-button.tsx` -> `lib/supabase/client.ts`
- `components/professional/*` -> `lib/supabase/client.ts`
- `components/professional/dashboard-overview.tsx` -> `components/professional/booking-link-card.tsx`

## Servidor

- `app/api/notify-booking/route.ts` -> Supabase Admin + Expo Push API
- `components/public/booking-flow.tsx` -> chama `POST /api/notify-booking`

## Banco

- `supabase/sql/mvp_schema.sql` define estrutura usada por toda a aplicacao web/mobile.
