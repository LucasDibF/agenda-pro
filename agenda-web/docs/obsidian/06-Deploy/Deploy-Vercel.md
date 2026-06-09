# Deploy na Vercel

## Web (`agenda-web`)

```bash
cd "agenda-web"
npx vercel --prod --yes
```

## Pré-check

- `npm run build` sem erros.
- variáveis na Vercel configuradas.
- branch correta no GitHub.

## Build local

```bash
cd "agenda-web"
npm install
npm run build
```

## Observação

Se rodar `vercel` na pasta raiz errada, a Vercel não detecta o framework corretamente.
