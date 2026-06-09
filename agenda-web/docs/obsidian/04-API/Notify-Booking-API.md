# API: Notify Booking

Arquivo:

- `agenda-web/app/api/notify-booking/route.ts`

## Objetivo

Enviar push para a profissional quando um novo agendamento for criado.

## Contrato

- Método: `POST`
- Rota: `/api/notify-booking`
- Body:

```json
{
  "appointmentId": "uuid-do-agendamento"
}
```

## Fluxo interno

1. Valida `appointmentId`.
2. Consulta agendamento no Supabase (service role).
3. Busca `profiles.push_token` da profissional.
4. Envia notificação via Expo Push API.
5. Retorna `ok` ou erro.

## Dependências de ambiente

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
