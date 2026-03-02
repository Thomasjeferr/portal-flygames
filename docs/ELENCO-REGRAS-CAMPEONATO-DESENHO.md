# Desenho: Regras de Elenco por Campeonato (Tournament)

Objetivo: quando um time está **aprovado/confirmado** em um campeonato (FREE/PAID/GOAL), aplicar regras de elenco definidas pelo admin: prazo para envio, travamento por envio ou data, e permissão de alteração (mudar tudo ou N jogadores por fase).

Este documento descreve **o que podemos aproveitar**, o que precisa ser criado e o fluxo completo — **antes de qualquer alteração de código**, para você validar.

---

## 1. O que já temos e o que aproveitar

### 1.1 Modelos atuais

| Modelo | Uso | Aproveitamento |
|--------|-----|----------------|
| **Team** | Time do portal | Mantido. O time que se inscreve no torneio é o mesmo. |
| **TeamMember** | Elenco global do time (nome, função, número, posição, foto, ativo) | Mantido. Continua sendo a lista “viva” que o time edita no painel. |
| **Tournament** | Torneio (FREE/PAID/GOAL, status, premiação, regulamento) | Estender com **regras de elenco** (prazo, tipo de travamento, N por fase). |
| **TournamentTeam** | Inscrição do time no torneio (teamStatus: APPLIED \| IN_GOAL \| CONFIRMED \| REJECTED \| ELIMINATED) | Estender com **data de envio do elenco** e, se necessário, contadores por fase. |
| **TournamentMatch** | Partida da chave (round: 32, 16, 8, 4, 2) | Usar **round** como “fase” para a regra “N alterações por fase”. |

- **Elenco hoje:** um único conjunto **TeamMember** por time; não existe “elenco por torneio”. Para não travar o time em todos os campeonatos ao travar em um, precisamos de **cópia/snapshot do elenco por torneio** no momento do envio (ver abaixo).

### 1.2 Fluxo atual de aprovação no campeonato

- Time se inscreve → **TournamentTeam** com `teamStatus` APPLIED (ou IN_GOAL para GOAL).
- Admin aprova / pagamento confirma / meta atingida → `teamStatus` vira **CONFIRMED**.
- A partir daí o time está “efetivamente na competição”.

**Regra clara:** as regras de elenco do campeonato (prazo, envio, travamento, N por fase) **só se aplicam a times confirmados e aprovados no campeonato**, ou seja, quando `TournamentTeam.teamStatus === 'CONFIRMED'`. Times em APPLIED, IN_GOAL, REJECTED ou ELIMINATED **não** entram nessas regras; o elenco deles segue sendo apenas o global (TeamMember), sem prazo nem travamento por torneio.

### 1.3 Área do time (elenco atual)

- Página: `/painel-time/times/[id]/elenco`.
- API: GET/POST/PATCH/DELETE `/api/team-portal/teams/[id]/members` (lista global de **TeamMember**).
- Inserir, editar e excluir jogadores hoje não têm vínculo com torneio; é sempre a lista global.

Aproveitamos a mesma tela e as mesmas APIs para **edição** dos membros; a diferença é que, quando o time estiver em um torneio com regras de elenco, a **permissão** de editar (e o “envio” do elenco) passam a depender das regras do torneio e do estado de envio/travamento.

---

## 2. Regras de negócio desejadas (resumo)

1. **Quando o time está aprovado e na competição**  
   O sistema aplica as regras de elenco **configuradas pelo admin** naquele campeonato.

2. **Prazo para envio (data limite)**  
   - Admin define uma data (ex.: 20/10/2026) “até quando” o time pode enviar o elenco.  
   - Até essa data (e antes de clicar em “Enviar elenco”), o time pode **incluir, editar e excluir** jogadores normalmente.  
   - A partir do **envio** (botão “Enviar elenco”) **ou** da **passagem da data**, o elenco **trava** para aquele campeonato (com exceção da regra “N por fase”, se houver).

3. **Travamento**  
   - Travado = não pode mais alterar a lista de jogadores **daquele campeonato** (salvo a regra “N alterações por fase”).  
   - Duas formas de travar:  
     - Time clicou em **“Enviar elenco”** (registramos a data/hora).  
     - **Data limite** passou (mesmo sem clicar em enviar).

4. **Regras adicionais (após o travamento)**  
   O admin pode escolher uma das duas políticas:  
   - **Liberar mudar o elenco todo:** após travar, **não** permite mais alterações (comportamento padrão).  
   - **Liberar N alterações por fase:** após travar, o responsável pode alterar **1, 2, 3 ou mais** jogadores **por fase** (ex.: fase de grupos, oitavas, quartas, etc.), conforme o regulamento. Quem define N é o admin; “fase” pode ser o **round** do mata-mata (32, 16, 8, 4, 2) ou um conceito de fase que o admin definir depois.

---

## 3. Conceito: “Elenco do time no campeonato” (snapshot)

Hoje existe só o elenco **global** (TeamMember). Se travarmos a edição global quando o time “envia” o elenco no campeonato A, ele não poderia mais alterar para o campeonato B. Por isso:

- **Elenco “oficial” por campeonato** = uma **cópia/snapshot** da lista de jogadores **naquele** torneio.
- Quando o time **envia** o elenco (ou quando a data limite passa), gravamos quais **TeamMember** fazem parte do elenco daquele **TournamentTeam** (inscrição).
- Daí em diante, para **súmulas, listas oficiais e regras daquele campeonato**, usamos essa lista vinculada ao torneio, e não a lista global.
- A lista global (TeamMember) continua podendo ser editada **até** o travamento (e, se a regra for “N por fase”, voltamos a permitir um número limitado de alterações por fase na **lista do campeonato**).

Em termos de dados:

- **Tournament** ganha campos de **regras de elenco** (prazo, tipo de travamento, N por fase).
- **TournamentTeam** ganha **data de envio do elenco** e, se for “N por fase”, um jeito de contar quantas alterações já fez em cada fase (ex.: por round).
- Nova entidade **TournamentTeamElenco** (ou nome parecido): para cada **TournamentTeam**, guardamos **quais TeamMember** fazem parte do elenco daquele campeonato (snapshot no envio + alterações permitidas por fase).

Assim, “travado” significa: não pode mais mudar **TournamentTeamElenco** exceto quando a regra permitir “N alterações nesta fase”.

---

## 4. Modelo de dados proposto

### 4.1 Tournament (novos campos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `elencoDeadlineAt` | DateTime? | Data/hora limite para o time enviar o elenco (ex.: 20/10/2026 23:59). Se null, só trava ao clicar em “Enviar elenco”. |
| `elencoChangeRule` | String | `FULL` \| `N_PER_PHASE`. FULL = após travar não pode alterar; N_PER_PHASE = após travar pode alterar até N jogadores por fase. |
| `elencoChangesPerPhase` | Int? | Quando `elencoChangeRule === 'N_PER_PHASE'`, número máximo de alterações (troca de jogadores) permitidas por fase. Ex.: 2 = pode trocar 2 jogadores por fase. |

- Admin define esses três no cadastro/edição do **campeonato**.

### 4.2 TournamentTeam (novos campos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `elencoSubmittedAt` | DateTime? | Quando o time clicou em “Enviar elenco”. Null = ainda não enviou. |
| (opcional) `elencoCurrentPhaseRound` | Int? | Última “fase” considerada para contagem de alterações (ex.: round 32, 16, 8, 4, 2). Usado para saber quando resetar o contador “alterações nesta fase”. |

- “Elenco travado para este torneio” = `(elencoSubmittedAt != null) OU (agora > tournament.elencoDeadlineAt e deadline não é null)`.

### 4.3 Nova tabela: TournamentTeamElenco (snapshot por campeonato)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | String | PK (cuid) |
| tournamentTeamId | String | FK TournamentTeam |
| teamMemberId | String | FK TeamMember (jogador que está no elenco deste campeonato) |
| addedAt | DateTime | Quando entrou na lista (envio inicial ou alteração em fase) |
| (opcional) phaseRound | Int? | Round da fase em que foi adicionado (para N_PER_PHASE); null = envio inicial |

- **Unique** (tournamentTeamId, teamMemberId).
- Quando o time **envia** o elenco (ou atinge o deadline), populamos esta tabela com os **teamMemberId** atuais do time (TeamMember onde teamId = team do TournamentTeam).
- “Elenco oficial do time no campeonato” = lista em **TournamentTeamElenco** para aquele **TournamentTeam** (não a lista global TeamMember).
- Para “N alterações por fase”: ao permitir uma troca, adicionamos/removemos registros aqui e contamos quantas alterações já houve na fase atual (ex.: por round); quando o admin “avança a fase” (ou o sistema usa o round da próxima partida), resetamos o contador daquela fase.

### 4.4 Contagem “N alterações por fase” (opção simples)

- **Opção A:** nova tabela `TournamentTeamElencoChange` (tournamentTeamId, phaseRound, changesCount). Toda vez que o time faz uma alteração permitida na fase X, incrementamos `changesCount` para (tournamentTeamId, phaseRound). Comparar com `tournament.elencoChangesPerPhase` para permitir ou bloquear.
- **Opção B:** derivar “quantas alterações na fase” a partir de `TournamentTeamElenco.addedAt` e de um “início da fase” (ex.: data do primeiro jogo da fase). Mais complexo; a Opção A é mais clara.

Recomendação: **Opção A** — tabela de contagem por (TournamentTeam, phaseRound).

### 4.5 Fase = round do mata-mata (por enquanto)

- **TournamentMatch** já tem `round` (32, 16, 8, 4, 2). Podemos usar esse **round** como “fase” para a regra “N alterações por fase”.
- Quando o torneio avançar (ex.: round 32 terminou), o “round atual” pode ser definido pelo admin ou pela menor rodada que ainda tem jogo pendente. Assim, para cada (TournamentTeam, round) temos um `changesCount` e comparamos com `elencoChangesPerPhase`.

Se no futuro existir “fase” diferente de round (ex.: fase de grupos), podemos adicionar um campo ou tabela **TournamentPhase** (tournamentId, phaseKey, round?, startAt?) e associar as alterações à fase em vez de só ao round.

---

## 5. Fluxo completo (passo a passo)

### 5.1 Admin: configurar regras no campeonato

1. Em **Admin → Torneios → [Torneio] → Editar** (ou em “Regras do torneio” / “Elenco”):
   - **Data limite para envio do elenco:** campo data/hora (ex.: 20/10/2026 23:59). Opcional; se vazio, só trava ao clicar em “Enviar elenco”.
   - **Após o travamento:**
     - **Não permitir alterações** → `elencoChangeRule = FULL`.
     - **Permitir N alterações por fase** → `elencoChangeRule = N_PER_PHASE`, campo numérico “N” (1, 2, 3, …) → `elencoChangesPerPhase`.
2. Salvar no **Tournament**.

### 5.2 Time aprovado/confirmado no campeonato

1. Time está com **TournamentTeam.teamStatus = CONFIRMED** (apenas times confirmados entram nas regras de elenco).
2. Na **área do time**, ao acessar **Elenco** (ou uma seção “Elenco – Campeonato X”):
   - Sistema carrega as regras do torneio (deadline, FULL vs N_PER_PHASE, N).
   - Se **ainda não travado:**  
     - Mostra aviso: “Você tem até [data] para enviar o elenco” (ou “Envie o elenco quando estiver pronto”).  
     - Time pode **incluir, editar e excluir** jogadores na lista **global** (TeamMember) como hoje.  
     - Botão **“Enviar elenco”**: ao clicar, grava `TournamentTeam.elencoSubmittedAt = now()` e preenche **TournamentTeamElenco** com os IDs dos **TeamMember** atuais daquele time. A partir daí = travado para esse campeonato (salvo N por fase).
   - Se **travado por data** (passou o prazo e não enviou):  
     - Sistema considera “travado” e grava o snapshot da mesma forma (lista atual de TeamMember naquele momento), para não deixar sem lista oficial.
   - Se **travado por envio ou data** e regra = **FULL:**  
     - Não permite mais alterações no elenco **deste campeonato** (na UI pode bloquear edição quando o contexto for “elenco para este torneio”, ou esconder o botão Enviar e mostrar “Elenco enviado em [data]”).
   - Se **travado** e regra = **N_PER_PHASE:**  
     - Mostra “Você pode fazer até N alterações nesta fase.”  
     - Ao fazer uma alteração (adicionar/remover/substituir jogador na lista do campeonato), incrementamos o contador da fase atual. Quando `changesCount >= elencoChangesPerPhase`, bloqueamos mais alterações até a próxima fase (admin “avança fase” ou o sistema usa o próximo round).

### 5.3 Onde exibir “envio” e “travamento”

- **Opção 1 (recomendada):** na mesma página **Elenco** (`/painel-time/times/[id]/elenco`), mostrar um **bloco por campeonato** em que o time está CONFIRMED e que tem regras de elenco: “Campeonato X – Enviar até 20/10/2026” + botão “Enviar elenco” (se não travado) ou “Elenco enviado em …” (se travado). A edição da lista (TeamMember) é liberada ou bloqueada conforme as regras **daquele** campeonato (ou do “mais restritivo” se houver vários).
- **Opção 2:** uma página separada “Elenco por campeonato” (`/painel-time/times/[id]/elenco/campeonatos` ou por torneio) onde o time envia e vê estado por torneio. A lista global (TeamMember) continua editável até o envio em cada torneio.

Para não complicar no início: **Opção 1** na mesma tela de Elenco, com um card/bloco por torneio confirmado que tenha regras de elenco (deadline e/ou “Enviar elenco”).

### 5.4 Súmulas e listas oficiais do campeonato

- Para **jogos do torneio** (TournamentMatch) e relatórios oficiais do campeonato, a lista de jogadores do time deve ser a de **TournamentTeamElenco** (quando existir), e não a lista global **TeamMember**. Assim, mesmo que o time altere a lista global depois (em outro contexto), o campeonato continua usando o elenco enviado + alterações permitidas por fase.

---

## 6. Resumo do que aproveitar vs criar

| Item | Aproveitar | Criar/alterar |
|------|------------|----------------|
| Team, TeamMember | ✅ Sem mudança de estrutura | — |
| Página e APIs de elenco (GET/POST/PATCH/DELETE members) | ✅ Mesma tela e APIs para edição | Lógica de “pode editar?” conforme regras do(s) torneio(s) em que está CONFIRMED |
| Tournament | ✅ Já existe | Novos campos: elencoDeadlineAt, elencoChangeRule, elencoChangesPerPhase |
| TournamentTeam | ✅ Já existe | Novos campos: elencoSubmittedAt (e, se precisar, elencoCurrentPhaseRound ou uso de tabela de contagem) |
| TournamentMatch (round) | ✅ Usar como “fase” | — |
| Admin – edição de torneio | ✅ Tela existente | Campos: data limite envio elenco, regra (FULL / N por fase), N |
| Snapshot do elenco por torneio | — | Nova tabela **TournamentTeamElenco** (tournamentTeamId, teamMemberId, addedAt, phaseRound?) |
| Contagem “N por fase” | — | Nova tabela **TournamentTeamElencoChange** (tournamentTeamId, phaseRound, changesCount) ou um único contador por (TournamentTeam, phaseRound) |
| Botão “Enviar elenco” e travamento | — | Nova API (ex.: POST `/api/team-portal/teams/[id]/tournaments/[tournamentId]/elenco/submit`) + atualização de TournamentTeam e TournamentTeamElenco |
| UI: aviso de prazo e estado (enviado/travado) | — | Bloco/card na página de Elenco (ou página “Elenco – Campeonato”) |

---

## 7. APIs novas / alteradas (resumo)

| Método | Rota (exemplo) | Uso |
|--------|----------------|-----|
| GET | `/api/team-portal/teams/[id]/tournaments` (ou já existente) | Incluir nas respostas: para cada torneio em que o time está CONFIRMED, regras de elenco (deadline, changeRule, changesPerPhase) e estado (elencoSubmittedAt, se travado, alterações usadas na fase atual). |
| POST | `/api/team-portal/teams/[id]/tournaments/[tournamentId]/elenco/submit` | Time clica “Enviar elenco”. Verifica se pode enviar (não travado, dentro do prazo); grava elencoSubmittedAt; preenche TournamentTeamElenco com os TeamMember atuais do time. |
| GET | `/api/team-portal/teams/[id]/elenco/status` ou dentro do GET de torneios | Retornar, por torneio confirmado: podeEditar, travado, dataLimite, dataEnvio, alteraçõesUsadasNaFase, limitePorFase. |
| (Admin) PATCH | `/api/admin/tournaments/[id]` | Incluir no body: elencoDeadlineAt, elencoChangeRule, elencoChangesPerPhase. |
| (Admin) avançar fase (opcional) | POST `/api/admin/tournaments/[id]/advance-phase` ou ao finalizar rodada | Atualizar “fase atual” do torneio para que os times possam usar as “N alterações” da próxima fase. |

Para a edição de membros (POST/PATCH/DELETE em `/api/team-portal/teams/[id]/members`):  
- **Antes de implementar travamento:** não mudar.  
- **Depois:** ao receber a requisição, verificar se o time tem algum torneio CONFIRMED com elenco já travado (e regra FULL). Se tiver e a alteração afetar o elenco “oficial” daquele torneio, negar ou aplicar só se a regra for N_PER_PHASE e ainda houver cota na fase. (Detalhes podem ser refinados na implementação.)

---

## 8. Ordem sugerida de implementação

1. **Schema e migration**  
   - Tournament: elencoDeadlineAt, elencoChangeRule, elencoChangesPerPhase.  
   - TournamentTeam: elencoSubmittedAt.  
   - TournamentTeamElenco (snapshot).  
   - TournamentTeamElencoChange (contagem por fase), se N_PER_PHASE.

2. **Admin**  
   - Formulário do torneio: data limite, regra (FULL / N por fase), número N.  
   - Salvar e exibir nas telas de torneio.

3. **APIs de envio e estado**  
   - POST submit elenco (gravar snapshot em TournamentTeamElenco, elencoSubmittedAt).  
   - GET estado do elenco por torneio (travado, data limite, enviado, alterações na fase).

4. **Área do time – UI**  
   - Na página de Elenco (ou em “Campeonatos” do time): listar torneios confirmados com regras de elenco; mostrar prazo e botão “Enviar elenco”; após envio ou prazo, mostrar “Elenco enviado/travado em …”.  
   - (Opcional) Bloquear edição global quando o contexto for “este campeonato” e estiver travado (FULL), ou permitir apenas N alterações por fase (N_PER_PHASE).

5. **Travamento por data**  
   - Job ou verificação ao carregar a página: se `now() > elencoDeadlineAt` e elencoSubmittedAt ainda null, considerar travado e preencher snapshot (TournamentTeamElenco) com a lista atual, para não deixar time “sem elenco oficial”.

6. **N alterações por fase**  
   - Ao permitir alteração após travamento, atualizar TournamentTeamElenco e TournamentTeamElencoChange; ao avançar fase (manual ou por round), permitir novo lote de N alterações.

7. **Uso em súmulas/listas do campeonato**  
   - Onde hoje puder existir “jogadores do time no jogo do torneio”, usar TournamentTeamElenco em vez de TeamMember quando houver registro para aquele TournamentTeam.

---

## 9. Pontos a decidir com você

1. **Fase:** usar só o **round** do mata-mata (32, 16, 8, 4, 2) como “fase” para “N alterações por fase” é suficiente, ou você já quer um conceito de “fase” (ex.: fase de grupos) definido pelo admin?
2. **Vários torneios:** um mesmo time pode estar CONFIRMED em vários torneios. A regra é “pode editar globalmente enquanto pelo menos um torneio permitir” ou “cada torneio tem seu snapshot e o mais restritivo bloqueia a edição global”? (Recomendação: cada torneio com seu snapshot; edição global permitida até o envio em cada um; após envio, edição global não altera o snapshot daquele torneio, só “N por fase” altera o snapshot.)
3. **Apenas CONFIRMED:** ficou definido que as regras de elenco valem **somente** quando o time está **CONFIRMED** no campeonato. IN_GOAL, APPLIED etc. não entram.
4. **Texto na UI:** mensagens exatas para “Você tem até [data] para enviar o elenco”, “Elenco enviado em …”, “Você pode fazer até N alterações nesta fase” — quer padronizar em um lugar (ex.: arquivo de textos)?

Quando você fechar essas decisões, podemos detalhar a implementação (nomes exatos de tabelas, rotas e campos) e seguir para as mudanças no código.
