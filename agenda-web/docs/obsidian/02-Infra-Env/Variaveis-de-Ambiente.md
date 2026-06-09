# Variáveis de Ambiente

## Web (`agenda-web/.env.local`)

Veja também `agenda-web/.env.example` na raiz do app Next.

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_service_role_xxxxxxxxxxxxxxxxx

# Mesma origem em que esta app responde em /booking/[código] (ideal = URL do deploy na Vercel).
NEXT_PUBLIC_BOOKING_APP_URL=https://SEU-DEPLOY.vercel.app
```

## Mobile (`agenda-mobile/.env`)

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_WEB_APP_URL=https://seu-dominio.vercel.app
# Opcional: só para montar links /booking/... (se omitir, usa EXPO_PUBLIC_WEB_APP_URL).
EXPO_PUBLIC_BOOKING_APP_URL=https://seu-dominio.vercel.app
EXPO_PUBLIC_EAS_PROJECT_ID=seu-eas-project-id
```

## Link público de agendamento (`/booking/[código]`)

O formato é **`{ORIGEM}/booking/{booking_slug}`**, onde `booking_slug` é gerado a partir do **nome completo** no cadastro (ex.: `maria-silva`). Continua válido o código antigo (`booking_code`) e o UUID da profissional enquanto o SQL `mvp_profiles_booking_slug.sql` não for aplicado ou como fallback legado.

- **Web:** `NEXT_PUBLIC_BOOKING_APP_URL` controla a origem no link copiado no painel (`lib/public-booking-site.ts`). Em desenvolvimento, sem essa variável, costuma usar o próprio `window.location.origin`.
- **Mobile:** `EXPO_PUBLIC_BOOKING_APP_URL` (senão `EXPO_PUBLIC_WEB_APP_URL`) em `bookingAppBaseUrl` / `publicBookingPageUrl`.

Em produção, deixe **web e mobile apontando para o mesmo domínio** onde o projeto `agenda-web` está deployado e `/booking/...` retorna 200.

## Vercel (Project Settings > Environment Variables)

Configurar em **Production** e **Preview**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_BOOKING_APP_URL` (URL pública deste projeto; mesma base dos links `/booking/...`)

## Regra de segurança

- Nunca usar `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nunca commitar `.env` com dados reais.
