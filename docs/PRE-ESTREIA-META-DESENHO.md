# Pré-estreia Meta — Desenho visual

## Diagrama (abrir este .md no VS Code/Cursor para ver o Mermaid abaixo)

```mermaid
flowchart TB
    subgraph JA["✅ O que já temos"]
        A1[Banco: PreSaleGame]
        A1 --> A1a[metaEnabled, metaExtraPerTeam]
        A1 --> A1b[baselineHomeSubs / baselineAwaySubs]
        A1 --> A1c[metaHomeTotal / metaAwayTotal]
        A2[Validações Zod]
        A2 --> A2a[metaEnabled, metaExtraPerTeam opcionais]
        A2 --> A2b[Se meta: metaExtraPerTeam >= 1]
        A3[User.favoriteTeamId + Subscription]
        A3 --> A3a[Contar assinantes por time]
    end

    subgraph FALTA["🔲 O que falta implementar"]
        B1[Menu admin: Pré-estreia Meta]
        B2[Formulário NOVO Meta]
        B2 --> B2a[Times Mandante/Visitante obrigatórios]
        B2 --> B2b[Meta extra por time >= 1]
        B2 --> B2c[Sem preço clube / sem max simultâneos]
        B3[Formulário EDITAR para jogos Meta]
        B4[POST/PATCH: enviar e aceitar campos meta]
        B5[Home: bloco Pré-estreias com Meta]
        B5 --> B5a[Barras progresso por time]
        B5 --> B5b[Link Assinar pelo time]
    end

    subgraph FLUXO["Fluxo Pré-estreia Meta"]
        C1[Admin cria jogo Meta] --> C2[Home mostra progresso]
        C2 --> C3[Usuário assina pelo time]
        C3 --> C4[Meta bate]
        C4 --> C5[Jogo libera para todos]
    end

    JA --> FALTA
    FALTA --> FLUXO
```

---

## Resumo visual (texto)

| Área | Já temos | Falta |
|------|----------|--------|
| **Banco** | Campos meta no PreSaleGame | — |
| **Validações** | metaEnabled, metaExtraPerTeam, regras | — |
| **API POST** | Só modo Clubes | Enviar meta* e calcular baseline quando tipo Meta |
| **API PATCH** | Atualiza título, preços, etc. | Aceitar metaEnabled / metaExtraPerTeam |
| **Menu admin** | Item "Pré-estreia" (Clubes) | Item "Pré-estreia Meta" |
| **Admin novo** | Formulário Clubes (preço, simultâneos) | Formulário Meta (times + meta extra só) |
| **Admin editar** | Formulário único | Mostrar/editar meta nos jogos Meta |
| **Home** | Bloco "Pré-estreia" (todos) | Filtrar Clubes vs Meta; bloco "Pré-estreias com Meta" com progresso |

---

## Imagem gerada

Foi gerada uma imagem do desenho. Se o Cursor exibiu na conversa, você já a viu.  
Para abrir de novo: no Cursor, a imagem pode estar em **Assets** do projeto ou na pasta `.cursor` do workspace.
