# Redução de custos no Vercel

Este documento reúne ações já aplicadas e recomendações para manter o projeto viável comercialmente.

## O que já foi feito no código

- **Cache em APIs públicas**: as rotas mais acessadas passaram a enviar `Cache-Control` para a CDN/Edge cachear a resposta e reduzir invocações de Serverless Functions:
  - `/api/public/home-banners` — 60s cache, 120s stale-while-revalidate
  - `/api/public/live-highlight` — 30s cache
  - `/api/public/site-settings` — 5 min cache
  - `/api/public/teams` — 60s cache (lista de times muda pouco)

Com isso, visitas repetidas à home e a outras páginas que usam essas APIs tendem a ser atendidas pelo cache (Edge), gastando menos crédito de Functions.

---

## Recomendações no painel da Vercel

1. **Builds**
   - Em **Settings → Git**: deixe apenas o branch principal (ex.: `main`) para deploy automático; desative deploy em outros branches se não precisar.
   - Evite “Redeploy” desnecessário; cada build consome crédito.

2. **Funções (Serverless)**
   - Em **Settings → Functions**: confira a região (ex.: `iad1`). Regiões mais próximas do seu público podem reduzir tempo de execução e custo.
   - Monitore em **Usage** quais produtos mais consomem (Function Invocations, Execution Time, etc.) para priorizar otimizações.

3. **Plano**
   - Se o uso for baixo (poucos acessos e poucos deploys), avalie se o **Hobby** atende (com limites de uso).
   - No **Pro**, use os **$20 de crédito** com foco em tráfego real; picos pontuais (ex.: um dia com muito acesso) podem consumir boa parte do crédito.

---

## Alternativas se o custo continuar alto

1. **Outros hosts para o Next.js**
   - [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io): costumam ter planos com preço fixo ou mais barato que o Pro da Vercel para apps pequenos/médios.
   - Você mantém o mesmo código; em geral basta configurar build (`npm run build`), start (`npm start`) e variáveis de ambiente (incluindo `DATABASE_URL`).

2. **Híbrido**
   - Front estático (ou SSG) na Vercel e API/backend em outro serviço (Railway, Render, etc.) pode reduzir invocações de Functions na Vercel.

3. **Banco de dados**
   - O Neon (PostgreSQL) já é separado; manter o banco fora da Vercel é a configuração correta e evita custo extra de DB no Vercel.

---

## Resumo

- **Já aplicado**: cache nas APIs públicas (home-banners, live-highlight, site-settings, teams) para reduzir chamadas às Functions.
- **No painel**: controlar builds e região das Functions; acompanhar Usage.
- **Se precisar**: considerar Hobby ou migrar o app para Railway/Render/Fly.io para ter custo mais previsível.
