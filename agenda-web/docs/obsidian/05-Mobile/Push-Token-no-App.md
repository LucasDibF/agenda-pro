# Mobile: Push Token no App

Arquivo principal:

- `agenda-mobile/App.tsx`

## O que o app faz

- solicita permissão de notificação;
- obtém Expo push token;
- salva token em `profiles.push_token`.

## Requisito

No `.env` do mobile:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=seu-eas-project-id
```

## Observação Expo Go

No Expo Go há limitações para notificações. Para comportamento completo em background, usar development build ou app instalado.

## WhatsApp manual

Na tela Agenda, cada agendamento possui botão **WhatsApp** para contato manual com a cliente.
