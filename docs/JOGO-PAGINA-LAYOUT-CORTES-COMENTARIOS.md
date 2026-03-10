# Layout da página do jogo: cortes e comentários

## Onde está hoje

- **Título do jogo:** fica dentro do componente `MatchMeta`, **logo abaixo do player**, no arquivo:
  - `src/components/match/MatchPlayerPage.tsx` (que chama `MatchMeta` após o `children` = player)
  - O texto do título vem de `matchPlayerCommonProps.title` na página `src/app/jogo/[slug]/page.tsx`.

- **Ordem atual dos blocos** (quando o usuário tem acesso ao vídeo):
  1. Scoreboard (TIME A x TIME B)
  2. Player (vídeo)
  3. **MatchMeta** → tag REPLAY + **título do jogo** + data (ex.: "Grêmio Atlético Rio Branco x Espanhol Futebol Clube" + "Amistoso • 07 de março de 2026")
  4. **PlayerEngagement** → Compartilhar + curtir + **Comentários** (PlayerCommentSection)
  5. **GameHighlightsSection** → Melhores momentos (cortes)
  6. "Você também pode gostar"

Ou seja: hoje os **cortes** vêm **abaixo** dos **comentários**.

---

## O que você pediu (entendimento)

### Em aparelhos móveis
- Título do jogo (onde já está, abaixo do player).
- **Cortes** listados **logo abaixo do título** (acima dos comentários).
- **Comentários** logo abaixo dos cortes.

### Nos demais dispositivos (desktop/tablet)
- Avaliar colocar os **cortes** (e, se fizer sentido, os comentários) **na lateral do player** (ex.: player à esquerda, lista de cortes à direita), em vez de tudo empilhado embaixo.

---

## Desenho visual (wireframe)

### MÓVEL (visão desejada)

```
┌─────────────────────────────────────┐
│  ← Voltar ao início                  │
├─────────────────────────────────────┤
│  [ TIME A ]    2  x  1    [ TIME B ] │
│   GARB              EFC              │
├─────────────────────────────────────┤
│                                     │
│         [ PLAYER DE VÍDEO ]          │
│                                     │
├─────────────────────────────────────┤
│  REPLAY                             │
│  Grêmio Atlético Rio Branco x       │  ← TÍTULO DO JOGO (já existe)
│  Espanhol Futebol Clube             │
│  Amistoso • 07 de março de 2026     │
├─────────────────────────────────────┤
│  Melhores momentos                  │
│  Cortes e melhores lances           │
│  ┌─────┐ ┌─────┐ ┌─────┐ →         │  ← CORTES (mover para cá, acima dos comentários)
│  │ 0:45│ │ 1:02│ │ 0:38│           │
│  └─────┘ └─────┘ └─────┘             │
├─────────────────────────────────────┤
│  [Compartilhar]  [Curtir]           │
├─────────────────────────────────────┤
│  Comentários                        │  ← COMENTÁRIOS (abaixo dos cortes)
│  ─────────────────────────────────  │
│  Escreva um comentário...           │
│  [ Lista de comentários ]           │
└─────────────────────────────────────┘
```

### DESKTOP / TABLET (opção lateral)

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Voltar ao início                                               │
├──────────────────────────────────────────────────────────────────┤
│  [ TIME A ]        2  x  1         [ TIME B ]                      │
├──────────────────────────────────────────────────────────────────┤
│                        │                                          │
│   [ PLAYER DE VÍDEO ]  │  Melhores momentos                      │
│                        │  ┌─────────────────┐                    │
│                        │  │ Corte 1  0:45   │                    │
│                        │  │ Corte 2  1:02   │   ← CORTES NA LATERAL
│                        │  │ Corte 3  0:38   │      (ao lado do player)
│                        │  └─────────────────┘                    │
│                        │  ─────────────────────                   │
│                        │  Comentários                             │
│                        │  [ campo + lista ]    (opcional aqui)    │
├────────────────────────┼─────────────────────────────────────────┤
│  REPLAY                │                                          │
│  Título do jogo        │                                          │
│  Data                  │                                          │
├────────────────────────┴─────────────────────────────────────────┤
│  [Compartilhar]  [Curtir]                                          │
└──────────────────────────────────────────────────────────────────┘
```

Ou, se preferir manter compartilhar/curtir ao lado do título e comentários sempre embaixo (só cortes na lateral):

```
┌──────────────────────────────────────────────────────────────────┐
│  Scoreboard                                                       │
├────────────────────────────┬─────────────────────────────────────┤
│                             │  Melhores momentos                 │
│   [ PLAYER DE VÍDEO ]       │  [Corte 1] [Corte 2] [Corte 3] ... │
│                             │                                     │
├─────────────────────────────┴─────────────────────────────────────┤
│  REPLAY   Título do jogo   Data                                   │
│  [Compartilhar] [Curtir]                                           │
├──────────────────────────────────────────────────────────────────┤
│  Melhores momentos (em mobile: já acima dos comentários)          │
│  Comentários                                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Resumo do entendimento

| Dispositivo | Ajuste |
|-------------|--------|
| **Mobile** | Ordem: **Título** → **Cortes** (Melhores momentos) → **Comentários**. Ou seja, mover a `GameHighlightsSection` para cima do `PlayerEngagement` (que contém Compartilhar, Curtir e Comentários). |
| **Desktop/outros** | Avaliar layout em **duas colunas**: player (esquerda ou maior) e **cortes na lateral** (direita). Comentários podem ficar na lateral junto dos cortes ou mantidos abaixo, conforme preferência. |

Nenhuma alteração de código foi feita; este documento serve apenas de desenho/referência para a implementação.
