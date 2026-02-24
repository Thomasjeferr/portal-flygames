# Home – Organização de jogos (desenho, sem implementação)

Este doc desenha como organizar a **home** para apresentar:
- Jogos “normais” (gravados)
- **Pré-estreias** (clubes / meta)
- **Lives** (ao vivo e replays)
- Navegação / busca para facilitar a vida do usuário

Nada aqui é código – é só especificação de UX/estrutura para depois implementar.

---

## 1. Visão geral da home

Fluxo geral (topo → baixo):

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (logo, navegação, badge LIVE ao vivo)              │
├────────────────────────────────────────────────────────────┤
│ HERO / BANNER (carrossel)                                 │
│  - Destaques: jogo, pré-estreia, live ao vivo ou replay   │
├────────────────────────────────────────────────────────────┤
│ CONTINUAR ASSISTINDO (linha horizontal, máx 6)            │
├────────────────────────────────────────────────────────────┤
│ AO VIVO AGORA / PRÓXIMAS LIVES                            │
│  - Se houver live: card grande + botão “Assistir agora”   │
│  - Se não houver live: esconder ou mostrar próxima live   │
├────────────────────────────────────────────────────────────┤
│ PRÉ-ESTREIAS COM META                                     │
│  - Lista vertical (como já desenhado)                     │
├────────────────────────────────────────────────────────────┤
│ PRÉ-ESTREIA (clubes financiam)                            │
│  - Grade de cards (APOIAR)                                │
├────────────────────────────────────────────────────────────┤
│ ÚLTIMOS JOGOS AO VIVO (replays)                           │
│  - Carrossel horizontal de replays                        │
├────────────────────────────────────────────────────────────┤
│ JOGOS POR CAMPEONATO / CATEGORIA                          │
│  - Seções horizontais organizadas por campeonato/categoria│
├────────────────────────────────────────────────────────────┤
│ EXPLORAR TODOS OS JOGOS (link p/ página dedicada)         │
│  - + bloco de busca/filtros rápido                        │
└────────────────────────────────────────────────────────────┘
```

Ideia: a home vira um **“resumo inteligente”**:
- mostra o que é mais urgente/relevante (continuar, ao vivo, pré-estreias),
- traz atalhos para conteúdo específico (replays, campeonatos),
- e oferece uma **porta de entrada para o catálogo completo**.

---

## 2. Seções principais (detalhadas)

### 2.1 Hero / banner (já existe)

Sem grandes mudanças aqui – continua sendo o destaque gerenciado pelo admin:
- Pode ser **jogo**, **pré-estreia**, **live** ou conteúdo manual.
- Badge “AO VIVO” quando for banner de live ao vivo.

Só garantir que o Hero não roube espaço demais dos blocos de navegação abaixo.

---

### 2.2 Continuar assistindo (já especificado)

Referência: `docs/CONTINUAR-ASSISTINDO-DESENHO.md`.

Resumo:
- Uma linha horizontal, **máx 6** itens.
- Ordenado por `updatedAt` desc (mais recente primeiro).
- Card horizontal pequeno: thumbnail + título + barra de progresso.

---

### 2.3 Ao vivo agora / próximas lives

Objetivo: se tiver algo **ao vivo**, isso precisa aparecer logo no início da home.

```
┌────────────────────────────────────────────────────────────┐
│  AO VIVO AGORA                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [thumb 16:9]  Título da live                        │  │
│  │                Campeonato / competição (opcional)   │  │
│  │                [● bolinha vermelha piscando]        │  │
│  │                Botão: ASSISTIR AGORA                │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

- **Quando houver `liveHighlight.mode === 'LIVE'`:**
  - Mostrar essa seção logo abaixo de “Continuar assistindo”.
  - Card grande, com o mesmo visual da live page (título + descrição curta).
  - Botão **ASSISTIR AGORA** levando para `/live/[id]`.

- **Quando NÃO houver live ao vivo, mas houver próxima live agendada:**
  - Título: **Próxima live**
  - Card cinza/amarelo com data/hora e botão **Ver detalhes**.

Se preferir enxugar a home, essa seção pode ser **fundida** com o próprio Hero:
- Quando o banner atual é `FEATURED_LIVE`, só garantir que a copy fale “AO VIVO AGORA”.

---

### 2.4 Pré-estreias (meta + clubes financiam)

Hoje já temos dois blocos:
- **Pré-estreias com Meta** – lista vertical detalhada (barras de meta por time).
- **Pré-estreia (clubes financiam)** – grade de cards “APOIAR”.

Organização sugerida:

1. **Pré-estreias com Meta** – manter logo abaixo de Ao vivo/Continuar assistindo.
2. **Pré-estreia (clubes financiam)** um pouco abaixo, com grade de cards.

Isso já está bem direcionado; só garantir:
- Título claro: “Pré-estreias com Meta” e “Pré-estreias – clubes financiam”.
- CTAs levando para `/planos` ou `/pre-estreia/[id]/checkout`.

---

### 2.5 Últimos jogos ao vivo (replays)

Bloco já existente:

```
┌────────────────────────────────────────────────────────────┐
│  Últimos jogos ao vivo (Replays)                          │
│  [ card ][ card ][ card ][ card ]  → scroll horizontal    │
└────────────────────────────────────────────────────────────┘
```

- Fonte: tabela `Live` com `cloudflarePlaybackId` (replay disponível).
- Organização ideal:
  - Ordenar por data do jogo (endAt / updatedAt).
  - Mostrar **apenas replays “assistíveis”** (com acesso via regra de canAccessLive).
  - Badge “REPLAY”.

---

### 2.6 Jogos por campeonato / categoria

Aqui entra a pergunta “**e todos os jogos, como organizar para navegação?**”.

#### 2.6.1 Agrupamento principal

Usar o `championship` e/ou `Category` dos jogos para criar blocos:

```
Campeonato Carioca
[ card ][ card ][ card ][ card ]  → scroll horizontal

La Liga
[ card ][ card ][ card ][ card ]

Taça Cidade / Copa Local
[ card ][ card ][ card ][ card ]
```

Regras:
- Puxar jogos `displayMode in ['public_no_media', 'public_with_media']`.
- Agrupar por `category` (ou `championship` se category não existir).
- Ordenar campeonatos por `order` (campo da Category) e, em seguida, nome.
- Dentro de cada faixa, ordenar jogos por **data do jogo (gameDate desc)**.

#### 2.6.2 Limite por faixa e “ver todos”

Para não poluir a home:
- Exibir, por campeonato/categoria, **no máximo 10 jogos** na faixa da home.
- Adicionar um link “**Ver todos do campeonato**” que leva para a página de catálogo filtrada por aquele campeonato.

Exemplo de cabeçalho da seção:

```
Campeonato Carioca          [Ver todos →]
```

---

### 2.7 Bloco de busca/filtros rápido

Logo antes do rodapé ou logo após “Jogos por campeonato”, inserir um bloco de **busca simples**:

```
Encontre um jogo
[ Busca por texto ............. ]  [ Time ] [ Campeonato ] [ Ano ]
```

Comportamento:
- Campo de texto: busca por título (contém) e/ou time (nome / sigla).
- Filtros:
  - **Time**: dropdown com todos os times ativos.
  - **Campeonato**: dropdown com valores distintos de championship.
  - **Ano**: anos presentes em `gameDate` (ex.: 2023, 2024, 2025…).
- Botão “Pesquisar” leva para uma página de **catálogo** (ver abaixo) com esses filtros aplicados.

---

## 3. Página de catálogo de jogos (linkada da home)

Mesmo que não implementemos agora, é importante o desenho, porque a home apontará para ela.

### 3.1 Link na home

No final da seção “Jogos por campeonato”, adicionar:

```
Quer ver todos os jogos?
[ Ver catálogo completo de jogos → ]
```

Link para uma rota tipo: `/jogos` ou `/catalogo`.

### 3.2 Layout da página de catálogo

```
┌────────────────────────────────────────────────────────────┐
│  FILTROS                                                   │
│  [Busca texto] [Time] [Campeonato] [Ano] [Ordenar por ▼]   │
├────────────────────────────────────────────────────────────┤
│  RESULTADOS (GRID)                                        │
│  [card][card][card][card]                                 │
│  [card][card][card][card]                                 │
│  Paginação / lazy load                                    │
└────────────────────────────────────────────────────────────┘
```

Filtros e ordenação:
- **Busca**: texto (título, campeonato, times).
- **Time**: filtra jogos onde time é mandante ou visitante.
- **Campeonato**: por championship.
- **Ano**: baseado em gameDate.
- **Ordenar por**:
  - Mais recentes (padrão).
  - Mais antigos.
  - Jogos do meu time (se usuário tem favoriteTeamId).

---

## 4. Resumo prático de organização

**Topo da home (prioridade alta):**
- Hero (destaques).
- Continuar assistindo.
- Ao vivo agora / próxima live.

**Meio da home (novidades / projetos especiais):**
- Pré-estreias com meta.
- Pré-estreia (clubes financiam).
- Últimos jogos ao vivo (replays).

**Base da home (exploração):**
- Jogos por campeonato/categoria (carrosséis).
- Bloco “Encontre um jogo” + link para página de catálogo completo.

Assim:
- Usuário que entra “rápido” encontra logo **onde parou** e **o que está ao vivo**.
- Quem quer explorar “novidades” vê pré-estreias e replays recentes.
- Quem quer navegar por **torneio / time / ano** consegue ir para o catálogo completo e filtrar como quiser.

Nada disso está implementado – é só desenho da futura home, no mesmo espírito do doc de “Continuar assistindo”.

