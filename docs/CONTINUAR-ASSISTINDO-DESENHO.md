# Continuar assistindo — Desenho (sem implementação)

Este doc desenha as duas formas (simples e com posição) e a seção na home com cards menores.

---

## 1. Forma 1 — “Continuar assistindo” simples (sem posição no vídeo)

### 1.1 Fluxo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  USUÁRIO ABRE PÁGINA DO JOGO (/jogo/[slug])                                 │
│  → GamePlayTracker já chama POST /api/track-play { gameId }                 │
│  → Cria PlayEvent (userId, gameId, createdAt)                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NA HOME (ou /conta)                                                        │
│  → GET /api/me/continue-watching (ou dados já na página)                     │
│  → Backend: últimos N PlayEvents do userId, ordenados por createdAt DESC      │
│  → Para cada gameId: busca Game (titulo, slug, thumbnailUrl, etc.)           │
│  → Remove duplicatas (mesmo jogo várias vezes = mostra 1x, data da última)  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SEÇÃO "CONTINUAR ASSISTINDO"                                               │
│  → Lista de cards pequenos (thumbnail + título), link → /jogo/[slug]        │
│  → Sem barra de progresso (não temos posição)                               │
│  → Só aparece se usuário logado e tiver pelo menos 1 jogo “assistido”       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Dados

- **Fonte:** tabela `PlayEvent` (já existe). Filtro: `userId = session.userId`, ordenar por `createdAt` desc, limitar (ex.: 10), depois pegar jogos únicos (última aparição do jogo).
- **Novo:** apenas uma rota de API, ex.: `GET /api/me/continue-watching` → retorna lista de jogos (id, title, slug, thumbnailUrl, category/championship opcional). Sem nova tabela.

---

## 2. Forma 2 — “Continuar assistindo” com posição (retomar de onde parou)

### 2.1 Fluxo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DURANTE A REPRODUÇÃO                                                       │
│  → Player (ou componente na página do jogo) envia posição periodicamente    │
│  → Ex.: a cada 30s ou ao pausar/visibility change:                          │
│     PATCH /api/me/watch-progress { gameId, positionSeconds }                │
│  → Backend: upsert WatchProgress (userId, gameId, positionSeconds, updatedAt)│
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  AO ABRIR O JOGO (/jogo/[slug])                                             │
│  → GET /api/me/watch-progress?gameId=xxx (ou junto com os dados do jogo)    │
│  → Backend retorna { positionSeconds } se existir                           │
│  → Player aplica seek(positionSeconds) ao carregar o vídeo                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NA HOME — SEÇÃO "CONTINUAR ASSISTINDO"                                     │
│  → GET /api/me/continue-watching                                             │
│  → Backend: WatchProgress do userId onde positionSeconds > 0 e               │
│    positionSeconds < duração do vídeo (ou não terminou, ex. < 95%)         │
│  → Retorna jogos + positionSeconds + duration (para % na barra)             │
│  → Cards mostram barra de progresso (ex.: 35% assistido)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dados

- **Nova tabela (exemplo):**
  - `WatchProgress`: id, userId, gameId, positionSeconds, updatedAt.
  - Índice único (userId, gameId) para upsert.
- **APIs:**  
  - `PATCH /api/me/watch-progress` — body: `{ gameId, positionSeconds }`.  
  - `GET /api/me/watch-progress?gameId=xxx` — retorna `{ positionSeconds }` para um jogo.  
  - `GET /api/me/continue-watching` — retorna lista de jogos com progresso (incluindo positionSeconds e, se tiver, duration para calcular %).
- **Player:** precisa conseguir ler `currentTime` e chamar `seek(seconds)`. Em iframe (Cloudflare) pode ser limitado; em player próprio (HLS) é viável.

---

## 3. Desenho da seção na home — cards menores

Objetivo: seção **compacta**, sem banner grande, para não ocupar muito espaço.

### 3.1 Posição na página e layout (uma linha, scroll horizontal)

A seção “Continuar assistindo” fica **após o hero/banner** e **antes** das demais seções (ex.: “Em destaque”, “Pré-estreias”, “Lives”, etc.). Só aparece se o usuário estiver logado e houver pelo menos um jogo na lista.

**Layout obrigatório:**
- **Uma única linha** — cards **lado a lado** (nunca empilhados em 2x2 ou grid).
- **Scroll horizontal** — no desktop aparecem ~4–5 cards na tela; o resto é visto arrastando ou com setas. No mobile, 1–2 visíveis e arraste para o lado.
- **Ordem:** sempre o **último assistido em primeiro** (ordenar por `updatedAt` desc no WatchProgress).
- **Quantidade na seção:** exibir no máximo **6 itens** na lista (ou até 8, conforme preferência); quem tiver mais assistidos vê os 6 mais recentes. Opcional: link “Ver todos” se no futuro houver página dedicada.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  HERO / BANNER (carrossel)                                                │
├──────────────────────────────────────────────────────────────────────────┤
│  Continuar assistindo                                    [→] scroll       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ...   │
│  │ thumb    │ │ thumb    │ │ thumb    │ │ thumb    │ │ thumb    │        │
│  │ título   │ │ título   │ │ título   │ │ título   │ │ título   │        │
│  │ ████░░░░ │ │ ██████░░ │ │ ██░░░░░░ │ │ █████░░░ │ │ ███████░ │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ← 1º = mais recente     scroll horizontal, máx. 6 itens, 1 ao lado do outro
├──────────────────────────────────────────────────────────────────────────┤
│  Em destaque / Jogos / Pré-estreias / etc.                               │
│  ...                                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Tamanho e estilo dos cards (pequenos)

- **Formato:** card horizontal pequeno (thumbnail à esquerda, texto à direita) **ou** card quadrado pequeno (thumbnail em cima, título embaixo), em linha.
- **Tamanho sugerido:**
  - Largura por card: ~160px (quadrado) ou ~240px (horizontal).
  - Thumbnail: proporção 16:9, altura ~90px (quadrado) ou ~70px (horizontal).
  - Título: 1 linha, truncado com reticências; fonte menor que a dos cards “Em destaque”.
- **Sem:** banner grande, descrição longa, botão de “Play” gigante. Pode ter um ícone de “play” discreto ou só o clique no card.
- **Forma 1:** sem barra de progresso.
- **Forma 2:** barra fina de progresso (ex.: 2–4px de altura) na base do thumbnail ou do card, mostrando % assistido.

Esquema do card (formato quadrado pequeno):

```
┌─────────────────┐
│                 │
│   thumbnail     │   ← 16:9, ~160x90
│   16:9          │
│                 │
├─────────────────┤
│ Título do jogo  │   ← 1 linha, font pequena
│ (e opcional %)  │   ← Forma 2: "35% assistido" ou barra
└─────────────────┘
```

Esquema alternativo (card horizontal pequeno):

```
┌────────────────────────────────┐
│ ┌──────┐  Título do jogo       │
│ │ thumb │  (1 linha)            │
│ │ 16:9  │  [barra %] Forma 2   │
│ └──────┘                       │
└────────────────────────────────┘
```

### 3.3 Comportamento

- **Layout:** **só uma linha**; nunca 2x2 ou grid empilhado. Cards em fila horizontal com scroll lateral.
- **Scroll:** em desktop, ~4–5 cards visíveis; o resto via scroll horizontal (setas ou arrastar). Em mobile, 1–2 visíveis e arraste.
- **Ordem:** primeiro card = último assistido (mais recente); depois o anterior, e assim por diante. Máximo 6 itens na seção.
- **Link:** clique no card leva para `/jogo/[slug]`. Na Forma 2, o player já recebe `positionSeconds` e faz seek.
- **Vazio:** se não houver itens (usuário não logado ou nenhum PlayEvent/WatchProgress), a seção não é renderizada.

---

## 4. Resumo dos desenhos

| Item | Forma 1 (simples) | Forma 2 (com posição) |
|------|-------------------|------------------------|
| Fonte de dados | PlayEvent (já existe) | Nova tabela WatchProgress |
| API lista “continuar” | GET /api/me/continue-watching (jogos a partir de PlayEvent) | GET /api/me/continue-watching (jogos a partir de WatchProgress + positionSeconds) |
| Barra de progresso no card | Não | Sim (% ou barra fina) |
| Retomar no minuto exato | Não | Sim (seek no player) |
| Seção na home | Mesma: título “Continuar assistindo”, cards pequenos, scroll horizontal | Mesma + barra de progresso no card |

A **posição e o tamanho da seção na home** são os mesmos nas duas formas; só o conteúdo do card muda (com ou sem barra de progresso). Nada foi implementado — apenas desenho.
