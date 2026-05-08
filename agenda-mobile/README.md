# Agenda Mobile (Expo)

App mobile para profissionais usando o mesmo Supabase do projeto web.

## Pré-requisitos

- Node.js instalado
- Expo Go no celular (Android/iOS) ou emulador

## Configuração

1. Copie o arquivo de exemplo de ambiente:

```bash
cp .env.example .env
```

2. Edite o `.env` com os dados do seu Supabase:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Rodar em desenvolvimento

```bash
npm install
npm run start
```

Depois:

- pressione `a` para Android emulator
- pressione `i` para iOS simulator (macOS)
- ou escaneie o QR code com o Expo Go no celular

## Status atual

- Login com Supabase
- Sessão persistida no app (AsyncStorage)
- Dashboard inicial com logout

## Próximas etapas sugeridas

1. Lista de agendamentos do dia (appointments)
2. Alteração de status (`agendado`, `confirmado`, `cancelado`, `concluido`)
3. Cadastro e gestão de serviços
4. Disponibilidade e bloqueios no mobile
