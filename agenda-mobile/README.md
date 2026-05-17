# Agenda Mobile (`agenda-mobile`)

Aplicativo mobile da área profissional, usando o mesmo backend Supabase da versão web.

## Stack

- Expo SDK `54`
- React Native `0.81`
- TypeScript
- Supabase JS `v2`
- `react-native-safe-area-context`
- `@react-native-community/datetimepicker`
- `expo-clipboard`

## Funcionalidades atuais

- Login da profissional com Supabase
- Dashboard com:
  - saudação
  - agenda de hoje
  - visão geral de status
  - código/link de agendamento com copiar
- Modo claro/escuro
- Agenda:
  - listar agendamentos do dia
  - alterar status
  - abrir WhatsApp ao confirmar
  - reagendar apenas com slots disponíveis
- Serviços:
  - criar
  - listar
  - ativar/desativar
  - excluir
- Disponibilidade:
  - criar horários
  - editar horários
  - ativar/desativar
  - excluir
- Bloqueios:
  - criar
  - listar
  - remover

## Variáveis de ambiente

Crie `agenda-mobile/.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

Preencha:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_WEB_APP_URL=https://lash-agenda.vercel.app
```

## Rodar localmente

```bash
cd "agenda-mobile"
npm install
npx expo start -c
```

Atalhos:

- `a`: Android
- `i`: iOS (macOS + Simulator)
- ou QR Code no Expo Go

## Observação sobre sessão

Atualmente o app está configurado com `persistSession: false` no cliente Supabase mobile para evitar erro nativo de storage em algumas instalações.

Se você quiser persistência de sessão, pode migrar para `expo-secure-store` em uma próxima etapa.

## Relação com o Web

- O app usa o mesmo banco/tabelas da versão web
- O link de agendamento gerado no mobile segue o padrão:
  - `EXPO_PUBLIC_WEB_APP_URL/booking/{professionalId}`

## Documento consolidado

- Consulte também: `../lash-agenda/docs/Documentacao_Atualizada.md`
