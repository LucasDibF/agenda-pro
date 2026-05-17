# Agenda Online — aplicação web

Aplicação web do SaaS de agendamento para profissionais.

## Stack

- Next.js `16` (App Router)
- React `19`
- TypeScript
- Tailwind CSS `4`
- Supabase (Auth + Postgres + RLS)
- Deploy recomendado: Vercel

## Funcionalidades implementadas

### Área da profissional

- Login e registro com Supabase Auth
- Dashboard com visão geral e próximos agendamentos
- Gestão de serviços (criar, listar, ativar/desativar, excluir)
- Gestão de disponibilidade semanal
- Gestão de bloqueios de agenda
- Agenda diária com alteração de status de atendimento
- Link público de agendamento para compartilhar

### Área pública (cliente)

- Entrada por código/link da profissional
- Seleção de serviço, data e horário disponível
- Preenchimento de dados do cliente
- Confirmação de agendamento

## Regras de negócio aplicadas

- Não permite sobreposição de agendamentos ativos (`agendado`/`confirmado`)
- Considera duração do serviço no cálculo de slots
- Exclui horários bloqueados e fora da disponibilidade
- Profissional acessa apenas os próprios dados (RLS)
- Cliente não possui painel autenticado

## Estrutura principal

- `app/(dashboard)/professional/*`: telas da profissional
- `app/(public)/booking/*`: fluxo público de agendamento
- `components/professional/*`: componentes de gestão
- `components/public/*`: componentes do fluxo de cliente
- `supabase/sql/mvp_schema.sql`: schema + políticas + funções SQL

## Variáveis de ambiente

Crie `.env.local` na raiz deste projeto (`agenda-online` no `package.json`; pasta git costuma permanecer `lash-agenda`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
# Opcional: URL pública copiável no cartão «Link público». Se omitido, desenvolvimento usa o host atual e produção cai em https://lash-agenda-plum.vercel.app (enquanto o domínio `lash-agenda.vercel.app` não apontar para este projeto na Vercel).
NEXT_PUBLIC_BOOKING_APP_URL=https://lash-agenda-plum.vercel.app
```

## Rodar localmente

Na raiz do monorepo Saas, entre nesta pasta (`lash-agenda`) e rode:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Banco de dados (Supabase)

1. Abra o SQL Editor do Supabase
2. Execute o conteúdo de:
   - `supabase/sql/mvp_schema.sql`

Esse arquivo já inclui:

- tabelas
- índices
- triggers
- função de validação de agendamento
- função de slots ocupados (`get_booked_slots`)
- função de resolução de identificador da profissional (`resolve_professional_id`)
- políticas RLS

## Deploy (Vercel)

Configuração recomendada:

- Root Directory na Vercel: pasta deste app (normalmente `lash-agenda` no monorepo)
- Build command: padrão Next.js
- Variáveis em Production/Preview:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Opcional: `NEXT_PUBLIC_BOOKING_APP_URL` — mesmo host em que `/booking` responde 200 (links copiados do painel; hoje uso típico: `https://lash-agenda-plum.vercel.app` até ligar corretamente `lash-agenda.vercel.app` a este projeto nas configurações de domínio da Vercel)

## Documentação complementar

- Guia consolidado do projeto: `docs/Documentacao_Atualizada.md`
