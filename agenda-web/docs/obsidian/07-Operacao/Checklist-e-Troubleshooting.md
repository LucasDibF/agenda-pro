# Checklist e Troubleshooting

## Checklist de publicação

- [ ] `profiles.push_token` existe no Supabase.
- [ ] Profissional logou no app e token foi salvo.
- [ ] Booking público cria agendamento normalmente.
- [ ] API `/api/notify-booking` está ativa.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está na Vercel.
- [ ] Push chega no dispositivo da profissional.

## Problemas comuns

### Push não chega

- token não salvo em `profiles.push_token`;
- permissão de notificação negada no celular;
- `EXPO_PUBLIC_EAS_PROJECT_ID` faltando no mobile;
- `SUPABASE_SERVICE_ROLE_KEY` ausente na Vercel.

### Erro ao excluir serviço

Se já houver agendamento vinculado, o banco bloqueia exclusão (`on delete restrict`).

### Deploy quebra com UTF-8 inválido

Regravar arquivo corrompido e validar com `npm run build` antes de novo deploy.
