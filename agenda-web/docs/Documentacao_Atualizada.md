# Documentação Atualizada — Lillo

## Visão geral

O Lillo é a agenda online para profissionais, com duas interfaces:

- **Web (`agenda-web`)**: painel profissional + página pública de agendamento.
- **Mobile (`agenda-mobile`)**: app da profissional com as operações principais.

As duas aplicações compartilham o mesmo backend no Supabase.

## Arquitetura

### Frontend Web

- Next.js App Router
- Componentes client/server
- Tailwind CSS
- Supabase JS (cliente)

### Mobile

- Expo + React Native
- Supabase JS (cliente)
- DateTimePicker e Clipboard

### Backend

- Supabase Auth (login e cadastro)
- Postgres (dados de negócio)
- RLS para isolamento por profissional
- Funções SQL para regras de agendamento

## Módulos funcionais

### 1) Profissional (Web)

- Dashboard
- Serviços
- Disponibilidade
- Bloqueios
- Agenda diária
- Compartilhamento do link público

### 2) Cliente (Web público)

- Informa código/link da profissional
- Escolhe serviço
- Escolhe data e horário disponível
- Informa dados e confirma agendamento

### 3) Profissional (Mobile)

- Dashboard com identidade visual clara/escura
- Código/link de agendamento com copiar
- Agenda com:
  - troca de status
  - abertura de WhatsApp ao confirmar
  - reagendamento usando somente slots válidos
- CRUD de serviços
- CRUD de disponibilidade (com edição)
- CRUD de bloqueios

## Banco de dados

Schema principal: `supabase/sql/mvp_schema.sql`

Tabelas:

- `profiles`
- `business_settings`
- `services`
- `availability`
- `blocked_times`
- `appointments`

Recursos de regra:

- `appointment_status` enum
- constraint de não sobreposição em `appointments`
- trigger de validação para bloqueios e consistência de serviço/profissional
- triggers `updated_at`
- função `get_booked_slots(uuid, date)`
- função `resolve_professional_id(text)` (UUID ou código de booking)

## Regras de negócio implementadas

- Não aceitar conflito de horário para status ativos
- Respeitar duração do serviço em disponibilidade e reagendamento
- Não oferecer horários bloqueados
- Profissional só enxerga e altera próprios dados (RLS)
- Fluxo cliente sem painel autenticado

## Variáveis de ambiente

### Web (`agenda-web/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
```

### Mobile (`agenda-mobile/.env`)

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_WEB_APP_URL=https://seu-dominio.vercel.app
```

## Execução local

### Web

```bash
cd "agenda-web"
npm install
npm run dev
```

### Mobile

```bash
cd "agenda-mobile"
npm install
npx expo start -c
```

## Deploy

### Web (Vercel)

- Root Directory: `agenda-web`
- Configurar envs:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Mobile

- Uso atual via Expo Go (desenvolvimento/demonstração)
- Pode evoluir para build distribuível com EAS Build

## Fluxos críticos para teste

1. Cadastro/login profissional
2. Criação de serviços
3. Configuração de disponibilidade
4. Criação de bloqueio
5. Agendamento via página pública
6. Alteração de status no painel/app
7. Reagendamento sem conflito (somente slots disponíveis)
8. Mensagem WhatsApp ao confirmar

## Limitações atuais e próximos passos

- Sessão mobile atualmente sem persistência robusta (`persistSession: false`)
- Recomendado migrar para `expo-secure-store`
- Criar suíte de testes automatizados (web e SQL crítico)
- Evoluir documentação comercial e onboarding de cliente final

---

Última atualização: maio/2026
