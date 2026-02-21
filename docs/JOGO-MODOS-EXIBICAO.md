# Desenho: modos de exibição do jogo

## Campo no cadastro (Game)

Um único campo, por exemplo **`displayMode`** ou **`visibility`**, com 3 valores:

| Valor            | Nome (sugestão no formulário) | Significado |
|------------------|-------------------------------|-------------|
| `internal`       | Somente interno               | Registro organizacional. Sem player. Não vai pra home. |
| `public_no_media`| Público (sem vídeo)           | Vai pra home como publicação/card. Banner + escudos + dados. Sem player. |
| `public_with_media` | Público (com vídeo/live)   | Vai pra home e tem player (vídeo gravado ou live). |

---

## Onde cada modo aparece

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MODO: internal (Somente interno)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ADMIN          │  Cadastra/edita. Vê na listagem de jogos.                 │
│  PAINEL DO TIME │  Time vê na lista "Súmulas/Jogos". Abre súmula (dados,     │
│                 │  placar, escudos, banner). Sem player.                     │
│  HOME           │  Não aparece.                                               │
│  PÁGINA JOGO    │  Se alguém tiver o link: pode mostrar só súmula (sem       │
│  (/jogo/[slug]) │  player) ou retornar 404/restrito – você define.           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  MODO: public_no_media (Público sem vídeo)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ADMIN          │  Cadastra/edita. Vê na listagem.                          │
│  PAINEL DO TIME │  Time vê na lista "Súmulas/Jogos". Abre súmula. Sem player.│
│  HOME           │  Aparece como CARD/PUBLI: banner, escudos, título,        │
│                 │  placar (ex.: "Time A 2 x 1 Time B"). Link abre página    │
│                 │  do jogo (súmula), não player.                            │
│  PÁGINA JOGO    │  Página pública: banner, escudos, dados da partida,       │
│                 │  placar, súmula. Sem player.                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  MODO: public_with_media (Público com vídeo/live)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ADMIN          │  Cadastra/edita. Preenche videoUrl (ou link da live).     │
│  PAINEL DO TIME │  Time vê na lista. Abre súmula + pode ter link "Assistir"  │
│                 │  se tiver permissão.                                      │
│  HOME           │  Aparece como CARD com opção de assistir (player).         │
│  PÁGINA JOGO    │  Página pública com PLAYER (vídeo ou live). Quem tem       │
│                 │  acesso vê o vídeo; quem não tem vê só dados/assinatura.  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Resumo visual

```
                    ADMIN     PAINEL TIME    HOME           PÁGINA /jogo/[slug]
                    (sempre   (sempre        (lista/cards)  (detalhe)
                     vê)       vê)

internal             sim      sim (súmula)   NÃO           súmula só OU 404
                     (lista)   sem player

public_no_media      sim      sim (súmula)   SIM           súmula + banner +
                     (lista)   sem player     (como publi)  escudos, SEM player

public_with_media    sim      sim (súmula    SIM           PLAYER + súmula
                     (lista)   + assistir)     (com player) (acesso por assinatura)
```

---

## Regras em uma frase

- **internal:** só organização; painel do time vê súmula; não aparece na home; sem player em qualquer lugar.
- **public_no_media:** aparece na home como publi (card); página do jogo é súmula + banner + escudos; sem player.
- **public_with_media:** igual ao anterior na home e na página, mas **com** player (vídeo/live) para quem tiver acesso.

Assim o formulário de cadastro de jogo continua único: só se escolhe o modo e, quando for `public_with_media`, se preenche vídeo/live. O resto é regra de exibição (onde mostrar e se mostrar ou não o player).
