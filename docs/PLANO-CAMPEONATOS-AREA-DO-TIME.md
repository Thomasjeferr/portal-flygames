# Plano de ação: Campeonatos na Área do time (Participar + Ver regras)

## Objetivo

Quando um campeonato é criado e publicado, **todos os times cadastrados (aprovados)** passam a visualizá-lo na **Área do time** (painel do time), com:

- Nome do campeonato e premiação (prêmios em dinheiro e troféus)
- Botão **Participar** (inscrever o time no campeonato)
- Botão **Ver regras** (abrir regulamento)

Assim, o time pode se inscrever pela própria área, sem depender apenas do admin. O admin continua podendo inscrever times manualmente se quiser.

---

## Situação atual

- **Inscrição:** hoje só o **admin** inscreve times: em “Torneios” → “[Torneio]” → “Inscrever time” (POST `/api/admin/tournaments/[id]/teams`).
- **Área do time:** o usuário vê seus times em `/painel-time`; dentro de cada time há: Comissões, Elenco, Súmulas, Dados do time, Patrocinadores. **Não existe** tela de campeonatos.
- **Tipos de torneio:** FREE (grátis), PAID (inscrição paga), GOAL (meta de apoiadores). Para PAID, hoje o admin cria o `TournamentTeam` e o time paga depois (checkout existente).

---

## Escopo sugerido

1. **Listar campeonatos disponíveis** para o time na Área do time (publicados, que o time ainda não está inscrito — ou listar todos com estado “Já inscrito” / “Participar”).
2. **Exibir premiação** (já temos os campos no torneio).
3. **Botão “Participar”:** inscrever o time (criar `TournamentTeam`); se for pago, redirecionar para fluxo de pagamento.
4. **Botão “Ver regras”:** exibir regulamento (precisamos de um campo opcional no torneio: URL ou texto).
5. **Manter** inscrição pelo admin; não remover nada existente.

---

## Plano de implementação (passos)

### Fase 1 – Backend e dados

| # | Tarefa | Detalhes |
|---|--------|----------|
| 1.1 | **Campo “regulamento” no torneio** | Adicionar no model `Tournament`: `regulamentoUrl` (String?, opcional) e/ou `regulamentoTexto` (String?, opcional). Migration segura (coluna nullable). |
| 1.2 | **API: listar campeonatos para o time** | Nova rota **GET** `/api/team-portal/teams/[id]/tournaments` (ou `tournaments-available`). Autenticação: usuário deve ter acesso ao time (`getTeamAccess`). Retornar: torneios com `status === 'PUBLISHED'`, com premiação e indicador “já inscrito” (existência de `TournamentTeam`). Ordenar por data de criação ou fim da meta. Não retornar torneios em que o time já está inscrito, ou retornar todos e marcar estado (inscrito / pode participar). |
| 1.3 | **API: participar (inscrever)** | Nova rota **POST** `/api/team-portal/teams/[id]/tournaments/[tournamentId]/participar`. Verificar: usuário com acesso ao time; torneio publicado; time aprovado (`approvalStatus === 'approved'`); time ainda não inscrito. Conforme `registrationMode`: **FREE** → criar `TournamentTeam` com `teamStatus: 'CONFIRMED'` (ou APPLIED, conforme regra de negócio). **PAID** → criar `TournamentTeam` com `teamStatus: 'APPLIED'`, `paymentStatus: 'pending'`; resposta pode incluir `checkoutUrl` ou o front redireciona para página de pagamento existente. **GOAL** → criar `TournamentTeam` com `teamStatus: 'IN_GOAL'`, `goalStatus: 'PENDING'`, `goalPayoutPercent` do torneio (valor padrão) ou permitir parâmetro opcional. Retornar o `TournamentTeam` criado (e, se PAID, link/redirect para checkout). |

### Fase 2 – Admin (opcional mas recomendado)

| # | Tarefa | Detalhes |
|---|--------|----------|
| 2.1 | **Campos “Regulamento” no formulário** | Na página Criar/Editar campeonato, adicionar campo opcional “URL do regulamento” e/ou “Texto do regulamento”. Salvar em `regulamentoUrl` / `regulamentoTexto`. |
| 2.2 | **Manter fluxo atual** | Não remover “Inscrever time” no admin; admin continua podendo adicionar times manualmente. |

### Fase 3 – Área do time (frontend)

| # | Tarefa | Detalhes |
|---|--------|----------|
| 3.1 | **Nova página: Campeonatos** | Criar **`/painel-time/times/[id]/campeonatos`**. Listar campeonatos retornados pela API (1.2), em cards: nome, temporada, premiação (resumo), “Participar” e “Ver regras”. |
| 3.2 | **Link no layout do time** | No layout de cada time (`/painel-time/times/[id]/layout.tsx`), adicionar item de navegação **“Campeonatos”** apontando para `/painel-time/times/[id]/campeonatos`. |
| 3.3 | **Card do campeonato** | Para cada torneio: título (nome), subtítulo (ex.: temporada/região), bloco de premiação (prêmios em R$ e troféus, como na página pública), botão **Participar** (desabilitado se já inscrito), botão **Ver regras** (abre modal com texto ou abre URL em nova aba). Mesmo padrão visual do painel (futvar-dark, bordas, etc.). |
| 3.4 | **Fluxo “Participar”** | Ao clicar em Participar: chamar POST participar (1.3). Se FREE ou GOAL e sucesso → mostrar sucesso e atualizar lista (ou redirecionar para a página do campeonato `/torneios/[slug]`). Se PAID → redirecionar para página de pagamento da inscrição (reutilizar fluxo existente, ex.: página que chama `POST /api/tournament-registration/checkout` ou similar). |
| 3.5 | **Fluxo “Ver regras”** | Se `regulamentoUrl` existir → abrir em nova aba. Se só `regulamentoTexto` → abrir modal/drawer com o texto. Se ambos vazios → botão desabilitado ou tooltip “Regulamento não disponível”. |

### Fase 4 – Ajustes e validações

| # | Tarefa | Detalhes |
|---|--------|----------|
| 4.1 | **Quem pode participar** | Apenas times com `approvalStatus === 'approved'`. Opcional: só exibir campeonatos para times aprovados. |
| 4.2 | **Limites do torneio** | Se o torneio tem `maxTeams` e já atingiu o número de times confirmados/inscritos, não permitir nova inscrição (retornar erro na API e esconder ou desabilitar “Participar” no front). |
| 4.3 | **GOAL: percentual por time** | Ao participar pelo painel (GOAL), usar um `goalPayoutPercent` padrão (ex.: 0 ou valor configurável no torneio). Admin pode editar depois na tela do torneio, como já existe. |

---

## Ordem sugerida de implementação

1. **1.1** – Campo regulamento no schema + migration.  
2. **1.2** – GET campeonatos para o time.  
3. **1.3** – POST participar.  
4. **2.1** – (Opcional) Campos regulamento no admin.  
5. **3.1, 3.2, 3.3** – Página Campeonatos na Área do time + link no nav + cards.  
6. **3.4, 3.5** – Fluxos Participar e Ver regras.  
7. **4.1, 4.2, 4.3** – Regras de negócio (aprovação, maxTeams, goalPayoutPercent).

---

## Resumo de APIs novas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/team-portal/teams/[id]/tournaments` | Lista campeonatos publicados para o time (com premiação e status “inscrito” ou não). |
| POST | `/api/team-portal/teams/[id]/tournaments/[tournamentId]/participar` | Inscreve o time no campeonato (cria `TournamentTeam`). Para PAID, retorna indicação de redirect para checkout. |

---

## Resumo de novas telas / mudanças

- **Admin:** (opcional) campos “URL do regulamento” e/ou “Texto do regulamento” em Criar/Editar campeonato.  
- **Área do time:** nova página “Campeonatos” por time, com lista de campeonatos, premiação, “Participar” e “Ver regras”; link “Campeonatos” no menu do time.

Com esse plano, a implementação pode ser feita por fases, sem quebrar o fluxo atual do admin.
