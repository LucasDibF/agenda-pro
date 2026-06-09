# Inventario de Arquivos - Web (`agenda-web`)

## App Router

- `app/layout.tsx`
- `app/page.tsx`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/globals.css`
- `app/(public)/booking/page.tsx`
- `app/(public)/booking/[professionalId]/page.tsx`
- `app/(dashboard)/professional/layout.tsx`
- `app/(dashboard)/professional/page.tsx`
- `app/(dashboard)/professional/services/page.tsx`
- `app/(dashboard)/professional/calendar/page.tsx`
- `app/api/notify-booking/route.ts`

## Components - Auth

- `components/auth/login-form.tsx`
- `components/auth/protected-route.tsx`
- `components/auth/sign-out-button.tsx`

## Components - Public

- `components/public/booking-entry.tsx`
- `components/public/booking-calendar.tsx`
- `components/public/booking-flow.tsx`

## Components - Professional

- `components/professional/dashboard-overview.tsx`
- `components/professional/booking-link-card.tsx`
- `components/professional/services-manager.tsx`
- `components/professional/appointments-manager.tsx`
- `components/professional/availability-manager.tsx`
- `components/professional/blocked-times-manager.tsx`

## Lib / Config / DB

- `lib/supabase/client.ts`
- `supabase/sql/mvp_schema.sql`
- `next.config.ts`
- `next-env.d.ts`
- `tsconfig.json`
- `package.json`
- `package-lock.json`
