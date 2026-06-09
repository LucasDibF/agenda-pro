# Conexoes de Codigo - Mobile

## Arquitetura principal

- `App.tsx` -> `src/lib/supabase.ts`
- `src/lib/supabase.ts` -> Supabase backend

## App.tsx (macro)

Contem:

- autenticação da profissional;
- tabs e navegação interna;
- dashboards e telas operacionais;
- integração WhatsApp;
- integração notifications;
- realtime para dados da agenda.

## Dependencias externas no app

- `expo-clipboard`
- `expo-notifications`
- `expo-status-bar`
- `@react-native-community/datetimepicker`
- `react-native-safe-area-context`
- `@supabase/supabase-js`

## Integração com web/banco

- grava e lê dados no mesmo schema do web;
- usa `EXPO_PUBLIC_WEB_APP_URL` para link de booking;
- usa token push salvo em `profiles.push_token`.

## Camada de animação e microinterações

- `AnimatedBackground` cria blobs fluídos no fundo com `Animated.Value` + `Easing`;
- `AnimatedSection` aplica entrada progressiva (fade + slide vertical) nas secoes principais;
- `ProfessionalArea` usa transição de aba com `tabTransition` para troca suave de conteúdo;
- botoes de header e tabs usam `pressableShrink` para feedback tátil.
