# Raio-X do projeto — Erros e inconsistências (com pontuação)

Documento gerado a partir de análise automatizada e revisão do código. Objetivo: identificar erros, inconsistências e pontos de melhoria, com pontuação por categoria.

---

## Resumo executivo

| Categoria | Pontos (0–10) | Situação |
|-----------|----------------|----------|
| Compilação e tipos | 9 | TypeScript compila sem erros; `strict: true`. |
| Tratamento de erros em APIs | 8 | APIs retornam JSON e status adequados; alguns `console.error` em dev. |
| Tratamento de erros no frontend | 5 | Muitos `fetch` sem `.catch()` ou sem checagem de `res.ok`. |
| Consistência de rotas/nomenclatura | 7 | Padrão slug vs id claro; pequena inconsistência em torneios (`id` vs `tournamentId`). |
| Uso de `any` e tipagem | 7 | Poucos `any` (9 ocorrências em 6 arquivos); maioria justificável. |
| Segurança e credenciais | 9 | Nenhuma credencial real hardcoded; apenas placeholders. |
| Código de debug / produção | 7 | Poucos `console` fora de catch; webhook Woovi loga payload. |
| Boundaries e UX de erro | 4 | Sem `error.tsx`/`loading.tsx` por rota no App Router. |
| ESLint / qualidade estática | 6 | `next lint` deprecado; 4 `eslint-disable` pontuais. |

**Nota geral sugerida: 6,8 / 10** — Projeto sólido para produção, com espaço para melhorar tratamento de erro no frontend e boundaries de erro/loading.

---

## 1. Compilação e tipos — 9/10

**O que foi verificado:** `npx tsc --noEmit`, `tsconfig.json`.

**Resultado:**
- TypeScript compila **sem erros** em todo o `src`.
- `strict: true` está ativo.
- Nenhum `@ts-nocheck` ou `@ts-ignore` encontrado (apenas `as any` pontuais, ver seção 5).

**Perda de 1 ponto:** Uso de `any` em 6 arquivos (arrays em earnings, `navigator.share`, `catch (e: any)`), ainda que em poucos pontos.

---

## 2. Tratamento de erros em APIs — 8/10

**O que foi verificado:** Rotas em `src/app/api`, retorno JSON, status HTTP, try/catch.

**Pontos positivos:**
- Maioria das rotas retorna `NextResponse.json(..., { status: 4xx/5xx })` de forma consistente.
- Rotas de likes e comments (games/lives) foram ajustadas para **sempre** retornar JSON em erro (try/catch + mensagem genérica ou de dev).
- Uso de status adequados: 400 (validação), 401 (não autorizado), 403 (proibido), 404 (não encontrado), 500 (erro interno).

**Pontos de atenção:**
- Em **`src/lib/payments/stripe.ts`** e **`src/lib/payments/woovi.ts`**: `console.warn` / `console.error` em fluxos de pagamento (alguns em catch, outros em ramos de erro). Em produção, considerar logger condicional ou serviço de log.
- Em **`src/app/api/webhooks/woovi/route.ts`**: `console.error` com payload (`rawEvent`, chaves de charge) pode expor dados em logs de produção. Recomendação: logar apenas IDs ou resumos, não o payload completo.

**Perda de 2 pontos:** Logs em lib de pagamento e webhook com possível vazamento de dados em produção.

---

## 3. Tratamento de erros no frontend — 5/10

**O que foi verificado:** Uso de `fetch` em páginas e componentes, presença de `.catch()` e checagem de `res.ok`.

**Resultado:**
- **40+ arquivos** com pelo menos um `fetch` em cadeia **sem `.catch()`** ou sem tratamento explícito de `!res.ok`.
- Exemplos: `src/app/planos/page.tsx`, `src/app/admin/(dashboard)/banner/novo/page.tsx`, `src/app/admin/(dashboard)/sumulas/page.tsx`, e dezenas de páginas do admin, painel do time, parceiro, pré-estreia, torneios.
- Componentes como `PlayerCommentSection` e `PlayerLikeButton` **já foram ajustados** (leitura com `res.text()` + parse seguro e mensagem de erro na UI).

**Impacto:** Em falha de rede ou resposta inesperada, a Promise pode rejeitar sem tratamento → erro não capturado na UI, possível tela em branco ou comportamento estranho.

**Recomendação:** Em cada página/componente que faz `fetch`, adicionar `.catch(() => { ... })` e, quando fizer sentido, checar `res.ok` e exibir mensagem ou estado de erro.

**Perda de 5 pontos:** Grande quantidade de fetches sem tratamento de rejeição/erro.

---

## 4. Consistência de rotas e nomenclatura — 7/10

**O que foi verificado:** Uso de `[slug]` vs `[id]` vs `[gameId]`, etc., e nome da variável nos `params`.

**Padrão geral (bom):**
- **`[slug]`** em rotas públicas ou de leitura: `/jogo/[slug]`, `/resultados/[slug]`, `/torneios/[slug]`, `/pre-estreia/assistir/[slug]`.
- **`[id]`** em admin e painel: `/admin/.../times/[id]`, `/painel-time/times/[id]`, `/live/[id]`.
- **`[gameId]`**, **`[liveId]`**, **`[tournamentId]`**, **`[teamId]`** onde o segmento é semanticamente específico.

**Inconsistência identificada:**
- Em **`/admin/.../torneios/[id]`**: em algumas páginas o parâmetro é usado como `params.id` (ex.: `torneios/[id]/editar/page.tsx`), em outras como `tournamentId` (ex.: `torneios/[id]/pagar-inscricao/page.tsx`, `torneios/[id]/apoiar-time/page.tsx`). O segmento da URL é o mesmo (`[id]`), mas o nome da variável difere. Funciona, porém reduz consistência e legibilidade.

**Recomendação:** Padronizar: sempre ler `params.id` e, se quiser, atribuir a uma constante `tournamentId = params.id` no início do componente para clareza.

**Perda de 3 pontos:** Inconsistência em torneios e possível confusão em manutenção.

---

## 5. Uso de `any` e tipagem — 7/10

**O que foi verificado:** Ocorrências de `any` em `src/app`, `src/components` e APIs principais.

**Contagem:** 9 ocorrências em 6 arquivos.

| Arquivo | Uso |
|---------|-----|
| `src/app/api/team-portal/teams/[id]/earnings/route.ts` | `sponsorEarnings: any[]`, `planEarnings: any[]`, `goalEarnings: any[]` |
| `src/components/PreSaleShareButton.tsx` | `(navigator as any).share` (2x) — Web Share API |
| `src/components/player/PlayerShareButton.tsx` | `(navigator as any).share` (2x) — idem |
| `src/services/pre-sale-status.service.ts` | `client: any` |
| `src/app/api/admin/pre-sale-games/[id]/route.ts` | `updateData as any` |
| `src/app/admin/(dashboard)/partners/page.tsx` | `catch (e: any)` (3x) para `e.message` |

**Avaliação:** Os `(navigator as any).share` são comuns por falta de tipo nativo estável; os arrays `any[]` em earnings poderiam ser tipados com interfaces; `catch (e: any)` pode ser `catch (e: unknown)` e depois checar `e instanceof Error`. Nada crítico.

**Perda de 3 pontos:** Espaço para melhorar tipagem em earnings e em catch.

---

## 6. Segurança e credenciais — 9/10

**O que foi verificado:** Strings hardcoded que pareçam `apiKey`, `secret`, `password` em valor literal.

**Resultado:**
- **Nenhuma credencial real** encontrada no código.
- Senhas em **templates de e-mail** (preview/test): `password: 'Xy7kL9mN2p'` etc. em rotas de **preview/test de templates** — são dados de exemplo, não credenciais de sistema.
- `.env.example` e documentação usam apenas **placeholders** (ex.: `RESEND_API_KEY="re_xxx"`, `NEXTAUTH_SECRET="um-secret-aleatorio-seguro"`).

**Recomendação:** Manter senhas de exemplo apenas em rotas de preview/test e deixar claro em comentário que são falsas.

**Perda de 1 ponto:** Apenas por precaução (revisar periodicamente variáveis de ambiente).

---

## 7. Código de debug / produção — 7/10

**O que foi verificado:** `console.log`, `console.error`, `console.warn` fora de uso intencional (ex.: apenas em catch em dev).

**Resultado:**
- Maioria dos `console` está em **catch de rotas de API** ou em **scripts/seeds**.
- Em **`src/app/api/games/[gameId]/comments/route.ts`** e **likes/route.ts**: `console.error` apenas quando `process.env.NODE_ENV === 'development'` — correto.
- Em **`src/lib/payments/stripe.ts`** e **woovi.ts**: `console.warn` quando gateway não está configurado; `console.error` em erros de pagamento — em produção pode poluir logs ou expor detalhes.
- Em **`src/app/api/webhooks/woovi/route.ts`**: `console.error` com payload completo — risco de logar dados sensíveis.

**Recomendação:** Em produção, usar um logger que respeite `NODE_ENV` ou que redirecione para serviço de log; não logar payload completo de webhooks.

**Perda de 3 pontos:** Logs em pagamentos e webhook sem controle fino para produção.

---

## 8. Error / Loading boundaries e UX — 4/10

**O que foi verificado:** Existência de `error.tsx` e `loading.tsx` no App Router.

**Resultado:**
- **Nenhum** `error.tsx` ou `loading.tsx` encontrado em `src/app` (nem na raiz nem em rotas específicas).
- O App Router do Next.js usa esses arquivos para boundaries de erro e loading por segmento. Sem eles, um erro não capturado em um componente pode subir e quebrar a página inteira; carregamentos longos não têm fallback de loading por rota.

**Recomendação:** Adicionar pelo menos:
- `src/app/error.tsx` (e opcionalmente `layout.tsx` com boundary) para erro global.
- `src/app/loading.tsx` para loading global.
- Opcional: `error.tsx`/`loading.tsx` em segmentos críticos (ex.: `admin`, `painel-time`, `jogo/[slug]`).

**Perda de 6 pontos:** Ausência de boundaries padrão do App Router.

---

## 9. ESLint e qualidade estática — 6/10

**O que foi verificado:** `npm run lint`, presença de `eslint-disable` / `@ts-ignore`.

**Resultado:**
- `next lint` está **deprecado** (será removido no Next.js 16); o comando sugere migrar para ESLint CLI.
- **4** ocorrências de `eslint-disable` (ou comentário equivalente):
  - `src/app/admin/(dashboard)/comentarios/page.tsx`: `react-hooks/exhaustive-deps` — “only on mount from URL”.
  - `src/lib/payments/stripe.ts`: `@typescript-eslint/no-require-imports`.
  - `src/components/admin/BannerForm.tsx`: `react-hooks/exhaustive-deps`.
  - `src/app/page.tsx`: `@next/next/no-img-element`.
- Nenhum **TODO**, **FIXME** ou **HACK** em `.ts`/`.tsx`/`.js` (código sem dívidas explícitas marcadas).

**Recomendação:** Migrar para ESLint CLI conforme guia do Next.js; manter `eslint-disable` apenas onde necessário e documentado.

**Perda de 4 pontos:** Lint deprecado e uso de disable em 4 pontos (ainda que justificados).

---

## 10. Outros pontos (sem pontuação separada)

- **Imports não utilizados:** O linter atual não reportou; para varredura mais fina, usar regra de unused vars ou `noUnusedLocals` no TypeScript.
- **Duplicação de lógica:** Não foi feita varredura de código duplicado; pode ser tema de uma análise futura.
- **Testes automatizados:** Não avaliado neste raio-x; ausência de testes aumenta risco de regressão.

---

## Prioridades sugeridas

| Prioridade | Ação |
|------------|------|
| **Alta** | Adicionar `error.tsx` e `loading.tsx` (global e, se possível, em rotas críticas). |
| **Alta** | Tratar erros/rejeições em fetches nas páginas mais usadas (planos, admin, painel do time, checkout). |
| **Média** | Reduzir/condicionar `console` em `lib/payments` e no webhook Woovi; não logar payload completo em produção. |
| **Média** | Padronizar nome do parâmetro em rotas de torneios (`id` vs `tournamentId`). |
| **Baixa** | Tipar arrays em `team-portal/teams/[id]/earnings` e usar `unknown` em catch onde fizer sentido. |
| **Baixa** | Migrar de `next lint` para ESLint CLI e revisar regras. |

---

## Nota final

**Nota geral: 6,8 / 10**

- **Pontos fortes:** TypeScript em modo strict sem erros, APIs com tratamento de erro e JSON consistente, sem credenciais no código, padrão de rotas slug/id coerente.
- **Principais fraquezas:** Muitos fetches sem tratamento de erro no frontend e ausência de error/loading boundaries, o que pode impactar UX e resiliência em produção.

Com as melhorias de **tratamento de erro no frontend** e **boundaries**, a nota tende a subir para algo em torno de **7,5–8/10**.
