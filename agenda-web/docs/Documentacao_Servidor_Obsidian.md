# Agenda SaaS - Documentacao Completa de Servidor (Obsidian)

> Documento operacional para infraestrutura, backend, deploy, variaveis, SQL e notificacoes.
>
> Stack atual: **Next.js + Supabase + Vercel + Expo Notifications**

---

## 1) Visao Geral do Servidor

Este projeto usa:

- **Supabase** para Auth, Postgres, RLS e regras de negocio.
- **Vercel** para hospedar o web app (`agenda-web`).
- **API Route Next.js** para envio de push notification (`/api/notify-booking`).
- **Expo Push API** para notificar o app da profissional.

Fluxo principal de notificacao:

1. Cliente confirma agendamento no link publico.
2. Web salva em `appointments`.
3. Web chama `POST /api/notify-booking` com `appointmentId`.
4. API consulta `profiles.push_token`.
5. API envia push via `https://exp.host/--/api/v2/push/send`.

---

## 2) Estrutura de Arquivos (Servidor)

- `agenda-web/supabase/sql/mvp_schema.sql`
- `agenda-web/app/api/notify-booking/route.ts`
- `agenda-web/components/public/booking-flow.tsx`
- `agenda-mobile/App.tsx`
- `agenda-mobile/.env.example`

---

## 3) Variaveis de Ambiente

### 3.1 Web (`agenda-web/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_service_role_xxxxxxxxxxxxxxxxx
```

### 3.2 Mobile (`agenda-mobile/.env`)

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_WEB_APP_URL=https://seu-dominio.vercel.app
EXPO_PUBLIC_EAS_PROJECT_ID=seu-eas-project-id
```

### 3.3 Vercel (Project Settings -> Environment Variables)

Configurar em **Production** e **Preview**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 4) Supabase - SQL Obrigatorio

Se ainda nao aplicou o schema completo:

```sql
-- Executar o arquivo inteiro:
-- agenda-web/supabase/sql/mvp_schema.sql
```

Para a feature de notificacao push, o minimo obrigatorio e:

```sql
alter table public.profiles
add column if not exists push_token text;
```

### Validacao rapida

```sql
select id, full_name, push_token
from public.profiles
order by created_at desc
limit 20;
```

---

## 5) API de Notificacao (Servidor)

Arquivo: `agenda-web/app/api/notify-booking/route.ts`

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type NotifyBody = {
  appointmentId?: string;
};

export async function POST(request: Request) {
  const { appointmentId } = (await request.json()) as NotifyBody;
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId obrigatorio." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Variaveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias." },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointments")
    .select("professional_id, customer_name, appointment_date, start_time")
    .eq("id", appointmentId)
    .single();

  if (appointmentError || !appointment) {
    return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("push_token")
    .eq("id", appointment.professional_id)
    .single();

  if (profileError || !profile?.push_token) {
    return NextResponse.json({ ok: true, skipped: "professional-without-push-token" });
  }

  const [year, month, day] = appointment.appointment_date.split("-");
  const dateBr = `${day}/${month}/${year}`;
  const hour = appointment.start_time.slice(0, 5);

  const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: profile.push_token,
      title: "Novo agendamento",
      body: `${appointment.customer_name} marcou para ${dateBr} as ${hour}.`,
      sound: "default",
    }),
  });

  if (!expoResponse.ok) {
    return NextResponse.json({ error: "Falha ao enviar push para Expo." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
```

---

## 6) Trigger no Fluxo de Booking (Web)

No `booking-flow`, apos inserir agendamento, chamar a API:

```ts
const { data: insertedAppointment, error } = await supabase
  .from("appointments")
  .insert({
    professional_id: professionalId,
    service_id: selectedService.id,
    customer_name: form.customerName.trim(),
    customer_phone: form.customerPhone.trim(),
    customer_email: form.customerEmail.trim(),
    appointment_date: selectedDate,
    start_time: selectedSlot.startTime,
    end_time: selectedSlot.endTime,
    notes: form.notes.trim() || null,
    status: "agendado",
  })
  .select("id")
  .single();

if (insertedAppointment?.id) {
  fetch("/api/notify-booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId: insertedAppointment.id }),
  }).catch(() => {
    // Nao bloquear confirmacao do booking se push falhar.
  });
}
```

---

## 7) Registro de Push Token no Mobile

No app mobile, quando a profissional entra:

- pede permissao de notificacao;
- pega Expo push token;
- salva em `profiles.push_token`.

Trecho de referencia:

```ts
const tokenResult = await Notifications.getExpoPushTokenAsync({
  projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
});
const token = tokenResult.data;

await supabase
  .from("profiles")
  .update({ push_token: token })
  .eq("id", session.user.id);
```

---

## 8) Comandos Operacionais

### 8.1 Web local

```bash
cd "agenda-web"
npm install
npm run dev
```

### 8.2 Build local web

```bash
cd "agenda-web"
npm run build
```

### 8.3 Deploy web na Vercel

```bash
cd "agenda-web"
npx vercel --prod --yes
```

### 8.4 Mobile local (Expo)

```bash
cd "agenda-mobile"
npm install
npx expo start -c
```

---

## 9) Checklist de Publicacao

1. Supabase com `profiles.push_token` criado.
2. Vercel com `SUPABASE_SERVICE_ROLE_KEY`.
3. Mobile com `EXPO_PUBLIC_EAS_PROJECT_ID`.
4. Build web passando (`npm run build`).
5. Booking publico criando `appointments`.
6. Profissional com `push_token` salvo.
7. Push chegando no aparelho.

---

## 10) Troubleshooting

### 10.1 Push nao chega

- Verificar se `profiles.push_token` esta preenchido.
- Verificar `EXPO_PUBLIC_EAS_PROJECT_ID` no mobile.
- Verificar `SUPABASE_SERVICE_ROLE_KEY` na Vercel.
- Testar `POST /api/notify-booking` com `appointmentId` valido.

### 10.2 API retorna 500

Normalmente falta env:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 10.3 API retorna 404

- `appointmentId` invalido ou nao encontrado.

### 10.4 Sem notificacao no Expo Go

Expo Go tem limitacoes para notificacoes. Para uso confiavel em background, usar build instalada (development build / production build).

---

## 11) Seguranca

- Nunca usar `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Manter `service role` apenas no servidor (API Route).
- Nao commitar `.env` com chaves reais.

---

## 12) Historico de Evolucao (Servidor)

- RLS e regras de agenda implementadas no `mvp_schema.sql`.
- API `notify-booking` adicionada para push transacional.
- Fluxo publico passou a acionar notificacao apos `INSERT` em `appointments`.
- Mobile passou a armazenar `push_token` por profissional.

---

Documento pronto para uso no Obsidian (Markdown puro).
