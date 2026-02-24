# Checklist — Pré-estreia com Meta (função por função)

## Sua pergunta: quando os dois times batem a meta de assinantes, o jogo vai para que local?

### Resposta direta

**Hoje, no código atual:** quando as duas torcidas batem a meta de assinantes na Pré-estreia com Meta, **o jogo não é levado automaticamente para nenhum “local”**. O status do jogo continua **PRE_SALE** (ou o que estiver no banco). Ou seja:

- Não existe regra automática do tipo: “mandante e visitante bateram a meta → mudar status para PUBLISHED”.
- O serviço que recalcula status (`recalculatePreSaleGameStatus`) só olha **pré-estreia “Clubes financiam”** (slots pagos), não as metas de assinantes do Meta.

**Quando o jogo está com status PUBLISHED e tem `videoUrl`**, aí sim ele “vai” para estes locais:

| Onde aparece | O que acontece |
|--------------|----------------|
| **Home — faixa “Jogos por campeonato”** | Entra na lista de jogos da home junto com os jogos normais. O título da faixa é o nome da **categoria** vinculada ao jogo (primeira de `normalCategories`); se não tiver categoria, não entra nessa agrupamento. O link do card é **`/pre-estreia/assistir/[slug]`**. |
| **Página de assistir** | **`/pre-estreia/assistir/[slug]`** — página pública onde qualquer um pode assistir ao vídeo (quando status = PUBLISHED e há videoUrl). |
| **API pública** | **GET /api/pre-sale/games** — lista só jogos com `status: 'PUBLISHED'`. |
| **Banner (se configurado)** | Se houver um banner do tipo FEATURED_PRE_SALE apontando para esse jogo, ele pode aparecer no hero quando o jogo estiver PUBLISHED e com videoUrl. |

Resumindo: “para onde o jogo vai” = **lista de jogos da home** (por categoria) + **página `/pre-estreia/assistir/[slug]`**, mas **só depois** que o status estiver **PUBLISHED** e o jogo tiver **videoUrl**. Hoje isso não é definido automaticamente quando a meta de assinantes é batida; é algo que o admin faz (ou que precisamos implementar).

---

## Checklist função por função (Pré-estreia com Meta)

### 1. Criação do jogo (Pré-estreia Meta)

| Função | O que acontece |
|--------|----------------|
| Admin cria jogo em “Pré-estreia Meta” | POST `/api/admin/pre-sale-games` com `metaEnabled: true`, times mandante/visitante, `metaExtraPerTeam`. |
| Backend calcula metas | Para cada time, conta assinantes ativos com `favoriteTeamId` = esse time; `metaHomeTotal` = homeCount + metaExtraPerTeam; `metaAwayTotal` = awayCount + metaExtraPerTeam. |
| Status inicial | Jogo fica com status **PRE_SALE**. |
| Onde aparece na home | Bloco **“Pré-estreia”** (headline verde): cards com barras de progresso (mandante / visitante) e botão “Ser Patrocinador Torcedor”. |

### 2. Exibição das metas na home

| Função | O que acontece |
|--------|----------------|
| Contagem atual de assinantes | Para cada jogo Meta, busca `subscription.count` onde `active: true` e `user.favoriteTeamId` = homeTeamId ou awayTeamId. |
| Barras de progresso | `homeCurrent / homeTarget` e `awayCurrent / awayTarget` em %; exibidas no card. |
| Texto “Assinatura inativa” no menu | Não tem relação com a meta; é o status da **conta do usuário** (subscription ativa ou não). |

### 3. Quando as duas torcidas batem a meta

| Função | Hoje no código | Observação |
|--------|-----------------|------------|
| Transição automática para PUBLISHED? | **Não.** Nenhum código verifica “homeCurrent >= homeTarget e awayCurrent >= awayTarget” e altera o status. | Seria preciso implementar (ex.: job/cron ou botão “Publicar” no admin ao bater meta). |
| Recalcular status (recalculate) | `recalculatePreSaleGameStatus` só usa **clubSlots** (pagamentos dos 2 clubes). Para jogo **Meta** não há slots; então o recalculate não coloca esse jogo em PUBLISHED por causa de meta. | Endpoint: POST `/api/admin/pre-sale-games/[id]/recalculate`. |

### 4. Quando o jogo está PUBLISHED (com videoUrl)

| Função | Onde “o jogo vai” / o que acontece |
|--------|-------------------------------------|
| Home — lista de jogos | `getGames()` na home busca `preSaleGame` com `status: 'PUBLISHED'` e `videoUrl` não nulo. Esses jogos entram na lista geral com `href: /pre-estreia/assistir/[slug]` e aparecem nas faixas **“Jogos por campeonato”** (nome da faixa = primeira categoria do jogo). |
| Assistir | Rota **`/pre-estreia/assistir/[slug]`**: só exibe player se `status === 'PUBLISHED'` e `videoUrl` preenchido. |
| API pública | GET `/api/pre-sale/games`: retorna apenas jogos com `status: 'PUBLISHED'`. |
| Vídeo (Stream) | GET `/api/video/stream-playback`: para pré-estreia por slug, exige `status === 'PUBLISHED'` e `videoUrl`. |

### 5. Pré-estreia “Clubes financiam” (comparação)

| Função | O que acontece |
|--------|----------------|
| Dois clubes pagam os slots | `recalculatePreSaleGameStatus` coloca em **FUNDED** (2 slots PAID). |
| Admin adiciona videoUrl | Ao rodar recalculate de novo: **FUNDED + videoUrl** → status vira **PUBLISHED**. |
| Onde o jogo vai | Mesmo “local” que acima: lista da home (por categoria) + `/pre-estreia/assistir/[slug]`. |

---

## Lacuna identificada (para implementação futura)

Para que “quando os dois times batem a meta de assinantes no Pré-estreia com Meta o jogo vá” para a lista da home e para `/pre-estreia/assistir/[slug]`, seria necessário:

1. **Regra nova:** quando `metaEnabled === true` e `homeCurrent >= metaHomeTotal` e `awayCurrent >= metaAwayTotal` (e, se quiser, `videoUrl` já preenchido), definir status = **PUBLISHED**.
2. **Onde implementar:**  
   - Opção A: no serviço `recalculatePreSaleGameStatus`, além da lógica de clubSlots, tratar jogos Meta e checar essas contagens; ou  
   - Opção B: job/cron que periodicamente verifica jogos Meta e publica os que bateram meta; ou  
   - Opção C: botão no admin “Publicar quando meta batida” que checa e atualiza para PUBLISHED.

Enquanto isso não existir, o admin precisa **mudar manualmente** o status do jogo para PUBLISHED (e garantir que o jogo tenha `videoUrl`) para ele aparecer na home e em `/pre-estreia/assistir/[slug]`.

---

*Checklist criado para alinhar função por função; pode ser expandido com mais itens conforme você for citando.*
