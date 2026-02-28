# Fluxograma completo: Apoio por meta, ganhos do time e exclusão do campeonato

Este documento descreve o fluxo completo desde o apoio do torcedor até a preservação dos ganhos do time quando o campeonato é excluído.

---

## 1. Pode manter os ganhos ao excluir o campeonato?

**Sim.** Basta modelar o earning com referência **opcional** à assinatura e **onDelete: SetNull**:

- **TeamTournamentGoalEarning** tem `tournamentSubscriptionId` **nullable** e relação com **TournamentSubscription** usando **onDelete: SetNull**.
- Ao excluir o **Tournament** → o banco apaga em cascata as **TournamentSubscription** daquele torneio.
- Para cada **TeamTournamentGoalEarning** que apontava para uma dessas assinaturas, o banco **não apaga** o registro; apenas coloca **tournamentSubscriptionId = null**.
- O earning continua com **teamId**, **amountCents** e **status** → o time mantém o saldo e pode sacar normalmente.

---

## 2. Fluxograma geral (visão de alto nível)

```mermaid
flowchart TB
  subgraph Entrada
    A[Torcedor apoia time na meta]
  end

  subgraph Pagamento
    B[Stripe Subscription]
    C[invoice.paid]
  end

  subgraph Nosso sistema
    D[TournamentSubscription]
    E[User.favoriteTeamId = time]
    F[TeamTournamentGoalEarning]
    G[Subscription plano]
  end

  subgraph Time
    H[Saldo disponível]
    I[Saque]
  end

  subgraph Exclusão
    J[Admin exclui campeonato]
    K[Tournament DELETE]
    L[TournamentSubscription CASCADE]
    M[Earning: tournamentSubscriptionId = SetNull]
    N[Ganhos preservados]
  end

  A --> B
  B --> C
  C --> D
  C --> E
  C --> F
  C --> G
  F --> H
  H --> I

  J --> K
  K --> L
  L --> M
  M --> N
  F -.->|registro permanece| N
```

---

## 3. Fluxo detalhado: do apoio ao earning

```mermaid
flowchart LR
  subgraph Torcedor
    T1[Clica Quero apoiar este time]
  end

  subgraph Checkout
    T2[POST /api/tournament-goal/checkout]
    T3[Stripe Subscription criada]
    T4[metadata: userId, tournamentId, teamId, planId=tournament-goal]
  end

  subgraph Webhook invoice.paid
    W1[processTournamentGoalSubscriptionPaid]
    W2[TournamentSubscription criada/atualizada]
    W3[recalculateGoalSupportersAndConfirm]
    W4[ensurePortalSubscriptionForGoalSupporter]
    W5[User.favoriteTeamId = teamId]
    W6[Busca TournamentTeam.goalPayoutPercent]
    W7[amountToTeamCents = valor × percent / 100]
    W8[Cria TeamTournamentGoalEarning]
  end

  subgraph Persistência
    P1[(TournamentSubscription)]
    P2[(User)]
    P3[(TeamTournamentGoalEarning)]
  end

  T1 --> T2
  T2 --> T3
  T3 --> T4
  T4 --> W1
  W1 --> W2
  W2 --> W3
  W3 --> W4
  W4 --> W5
  W5 --> W6
  W6 --> W7
  W7 --> W8
  W2 --> P1
  W5 --> P2
  W8 --> P3
```

---

## 4. Fluxo: exclusão do campeonato e preservação dos ganhos

```mermaid
flowchart TB
  subgraph Estado antes
    A1[Tournament existe]
    A2[TournamentSubscription existe]
    A3[TeamTournamentGoalEarning existe\nteamId=X, tournamentSubscriptionId=Y, amountCents=Z]
  end

  subgraph Ação admin
    B1[Admin clica Excluir campeonato]
    B2[Confirma]
    B3[DELETE /api/admin/tournaments/id]
  end

  subgraph Banco de dados
    C1[prisma.tournament.delete]
    C2[CASCADE: tournament_teams apagados]
    C3[CASCADE: tournament_matches apagados]
    C4[CASCADE: tournament_subscriptions apagados]
    C5[TeamTournamentGoalEarning: FK tournamentSubscriptionId\nonDelete SetNull → valor vira NULL]
    C6[Registro de earning NÃO é apagado]
  end

  subgraph Estado depois
    D1[Tournament não existe]
    D2[TournamentSubscription não existe]
    D3[TeamTournamentGoalEarning existe\nteamId=X, tournamentSubscriptionId=NULL, amountCents=Z]
    D4[Time mantém saldo e pode sacar]
  end

  A1 --> B1
  A2 --> B1
  A3 --> B1
  B1 --> B2
  B2 --> B3
  B3 --> C1
  C1 --> C2
  C2 --> C3
  C3 --> C4
  C4 --> C5
  C5 --> C6
  C6 --> D1
  C6 --> D2
  C6 --> D3
  D3 --> D4
```

---

## 5. Fluxo do saque do time (incluindo ganhos de meta)

```mermaid
flowchart TB
  subgraph Saldo disponível
    S1[TeamPlanEarning pendentes]
    S2[TeamSponsorshipEarning pendentes]
    S3[TeamTournamentGoalEarning pendentes\ninclui earnings com tournamentSubscriptionId = null]
    S4[Total = S1 + S2 + S3]
  end

  subgraph Saque
    W1[Time solicita saque]
    W2[Valida valor ≤ saldo]
    W3[Cria TeamWithdrawal]
    W4[Cria TeamWithdrawalPlanItem]
    W5[Cria TeamWithdrawalSponsorshipItem]
    W6[Cria TeamWithdrawalGoalItem]
    W7[Atualiza status dos earnings para paid quando aplicável]
  end

  S4 --> W1
  W1 --> W2
  W2 --> W3
  W3 --> W4
  W3 --> W5
  W3 --> W6
  W4 --> W7
  W5 --> W7
  W6 --> W7
```

---

## 6. Diagrama de entidades (resumo)

```mermaid
erDiagram
  Tournament ||--o{ TournamentTeam : has
  Tournament ||--o{ TournamentSubscription : has
  TournamentSubscription }o--o{ TeamTournamentGoalEarning : "gera (FK SetNull)"
  Team ||--o{ TeamTournamentGoalEarning : receives
  Team ||--o{ TeamWithdrawal : has
  TeamTournamentGoalEarning ||--o{ TeamWithdrawalGoalItem : "incluído em"
  TeamWithdrawal ||--o{ TeamWithdrawalGoalItem : has

  TournamentSubscription {
    string id
    string userId
    string tournamentId
    string teamSupportedId
  }

  TeamTournamentGoalEarning {
    string id
    string teamId
    string tournamentSubscriptionId "nullable"
    int amountCents
    string status
  }

  TeamWithdrawalGoalItem {
    string withdrawalId
    string earningId
    int amountCents
  }
```

---

## 7. Resumo em texto

| Etapa | O que acontece |
|-------|----------------|
| Torcedor apoia | Stripe Subscription (tournament-goal); metadata com tournamentId, teamId, userId. |
| invoice.paid | TournamentSubscription; User.favoriteTeamId = teamId; TeamTournamentGoalEarning (teamId, tournamentSubscriptionId, amountCents). |
| Renovações | Novos TeamTournamentGoalEarning a cada cobrança. |
| Admin exclui campeonato | Tournament DELETE → CASCADE TournamentSubscription. TeamTournamentGoalEarning.tournamentSubscriptionId vira NULL (SetNull); registro permanece. |
| Time saca | Saldo = plan + sponsorship + **goal** (inclui earnings com ou sem tournamentSubscriptionId). Saque pode incluir TeamWithdrawalGoalItem. |

**Conclusão:** os ganhos dos times são mantidos mesmo com a exclusão do campeonato, desde que o modelo TeamTournamentGoalEarning use `tournamentSubscriptionId` opcional com `onDelete: SetNull`.
