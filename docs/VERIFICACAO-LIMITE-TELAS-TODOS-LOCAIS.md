# Verificação: lógica de limite de telas em todos os pontos

**Data:** 26/02/2026  
**Objetivo:** Garantir que a regra "quando há limite de telas, a URL de reprodução só é obtida via API com deviceId" está aplicada em todos os lugares que usam essa configuração.

---

## 1. Onde o limite de telas é CONFIGURADO (dados)

| Local | Configuração | Uso |
|-------|--------------|-----|
| **Admin > Planos** (novo / editar) | `maxConcurrentStreams` no plano | Valor padrão do plano de assinatura |
| **Admin > Patrocínios > Planos** (novo / editar) | `maxScreens` no plano de patrocínio | Limite para quem tem acesso via patrocínio empresa |
| **Admin > Usuários > [id]** | "Telas" na assinatura (ativar / Salvar telas) | Override por usuário na assinatura ativa |
| **API** | `POST /api/subscription/activate`, `PATCH /api/admin/users/[id]` | Persistem o valor |

Esses pontos apenas **gravam** o valor. A **aplicação** do limite está nos itens abaixo.

---

## 2. Onde o limite é APLICADO (reprodução de jogo)

### 2.1 Página do jogo — `/jogo/[slug]` ✅

- **Arquivo:** `src/app/jogo/[slug]/page.tsx`
- **Lógica:** Antes de chamar `getSignedPlaybackUrls`, verifica `getSubscriptionMaxScreens` e `getSponsorMaxScreens`. Se **houver** limite (`hasScreenLimit`), **não** preenche `streamPlaybackUrl` nem `streamHlsUrl`. Passa `streamContext={{ gameSlug }}` para o player.
- **Resultado:** O `VideoPlayer` chama `GET /api/video/stream-playback` com `gameSlug` e `deviceId`; a API aplica o limite.

### 2.2 API de reprodução — `GET /api/video/stream-playback` ✅

- **Arquivo:** `src/app/api/video/stream-playback/route.ts`
- **Quando:** Requisição com `gameSlug` (jogo da grade normal).
- **Lógica:** Exige `deviceId`; usa `getSponsorMaxScreens` e `getSubscriptionMaxScreens`; conta sessões ativas em `UserStreamSession`; retorna 403 se ultrapassar o limite.
- **Único lugar** que devolve URL assinada para jogo quando há sessão: tudo passa por aqui quando há limite.

### 2.3 API de dados do jogo — `GET /api/games/[gameId]` ✅

- **Arquivo:** `src/app/api/games/[gameId]/route.ts`
- **Lógica:** Para vídeo Stream com acesso, retorna `streamPlaybackRequired: true`. Nunca retorna URL assinada.
- **Resultado:** Qualquer cliente (web ou app) que use essa API sabe que deve obter a URL via `stream-playback` com `gameSlug` e `deviceId`.

---

## 3. Outros fluxos que usam vídeo Stream (sem limite de telas)

### 3.1 Pré-estreia — `/pre-estreia/assistir/[slug]` ✅ (correto não aplicar limite)

- **Arquivo:** `src/app/pre-estreia/assistir/[slug]/page.tsx`
- **Player:** `VideoPlayer` com `streamContext={{ preSaleSlug, sessionToken }}`. **Não** recebe `streamPlaybackUrl`/`streamHlsUrl` do servidor (página é client-side).
- **API:** Em `stream-playback`, o branch `preSaleSlug` valida sessão do clube (ou admin/fullAccess) e **não** exige `deviceId` nem aplica limite de telas.
- **Motivo:** Pré-estreia é acesso por clube/sessão; limite de telas é só para **assinatura/patrocínio** na grade normal. Comportamento correto.

### 3.2 Continuar assistindo ✅

- **Arquivo:** `src/components/ContinueWatchingSection.tsx`
- **Comportamento:** Apenas links para `/jogo/${slug}`. Não embute player; usuário cai na página do jogo, onde a lógica de limite já está aplicada.

### 3.3 Conta / Checkout ✅

- **Arquivo:** `src/app/conta/page.tsx`, `src/app/checkout/page.tsx`
- **Comportamento:** Links para `/jogo/${game.slug}`. Sem player embutido; mesma rota do jogo.

### 3.4 Lives — `/live/[id]` ✅

- **Comportamento:** Usa embed/Cloudflare Live; não usa `VideoPlayer` com Stream da grade de jogos nem `stream-playback` com `gameSlug`. Limite de telas não se aplica (produto diferente).

---

## 4. Resumo

| Ponto | Limite de telas aplicado? | Observação |
|-------|---------------------------|------------|
| Página do jogo `/jogo/[slug]` | ✅ Sim | Não preenche URLs no servidor quando há limite |
| API `stream-playback` com `gameSlug` | ✅ Sim | Exige deviceId e aplica limite |
| API `games/[gameId]` | ✅ Contrato | Retorna `streamPlaybackRequired`, não devolve URL assinada |
| Pré-estreia | ➖ Não (por desenho) | Acesso por clube; sem limite de telas |
| Continuar assistindo / Conta / Checkout | ✅ Sim | Redirecionam para `/jogo/[slug]` |
| Lives | ➖ Não | Outro produto |

**Conclusão:** A lógica de limite de telas está implementada em **todos os locais** em que a configuração (assinatura / patrocínio) se aplica: única entrada de reprodução de jogo com Stream é a página do jogo e a API `stream-playback`, e ambas respeitam o limite. Pré-estreia e lives não usam essa configuração por desenho.
