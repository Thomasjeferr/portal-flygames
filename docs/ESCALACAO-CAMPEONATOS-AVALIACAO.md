# Avaliação: Regras de campeonato na Escalação (como no Elenco)

Objetivo: avaliar como as regras de campeonato que existem na página de **Elenco** estão hoje e como poderíamos adaptá-las para a página de **Escalação**, **sem aplicar nenhuma alteração de código** — apenas análise e opções.

---

## 1. Como está o Elenco (em relação a campeonatos)

### 1.1 Regras por campeonato

- **Tournament** define:
  - `elencoDeadlineAt`: data limite para envio do elenco (opcional).
  - `elencoChangeRule`: FULL (não pode mais alterar após travar) ou N_PER_PHASE (N alterações por fase).
  - `elencoChangesPerPhase`: quando N_PER_PHASE, número máximo de alterações por fase.

- **TournamentTeam** (inscrição do time):
  - `elencoSubmittedAt`: quando o time clicou em "Enviar elenco".
  - Elenco **travado** = já enviou OU prazo passou (e nesse caso o sistema grava snapshot automaticamente).

- **Snapshot por campeonato:**
  - **TournamentTeamElenco**: lista de `teamMemberId` que compõem o elenco **oficial** daquele time naquele campeonato (gravado no envio ou no vencimento do prazo).
  - Para súmulas e listas oficiais do campeonato usa-se esse snapshot, não o TeamMember global.

### 1.2 Fluxo na UI (página Elenco)

- Lista de **campeonatos confirmados** em que o time está inscrito.
- Por campeonato:
  - Prazo para envio (se houver).
  - Botão **"Enviar elenco"** (se `canSubmitElenco`: confirmado, não enviou, prazo não passou).
  - Se travado e já enviou: "Elenco enviado em [data]" + "Ver elenco enviado".
  - Se travado por prazo sem envio: "Prazo encerrado — elenco travado."
- A edição da lista global (TeamMember) continua na mesma tela; o "envio" é um ato explícito por campeonato que grava o snapshot.

### 1.3 APIs envolvidas

- GET `/api/team-portal/teams/[id]/tournaments` — devolve, entre outros, `elencoDeadlineAt`, `elencoChangeRule`, `isElencoLocked`, `canSubmitElenco`, `enrollment.elencoSubmittedAt`.
- POST `/api/team-portal/teams/[id]/tournaments/[tournamentId]/elenco/submit` — envia elenco (grava snapshot em TournamentTeamElenco e `elencoSubmittedAt`).
- GET `/api/team-portal/teams/[id]/tournaments/[tournamentId]/elenco` — retorna elenco do time naquele campeonato (snapshot enviado ou lista atual).

---

## 2. Como está a Escalação hoje

- **Uma escalação por time:** `Team.lineupFormation` + `TeamLineupSlot` (formação + jogadores por linha/slot).
- **Sem vínculo com campeonato:** não há prazo, envio, travamento nem snapshot por torneio.
- **Uso previsto:** overlay de transmissão e pré-jogo (genérico).
- **Página:** escolha de formação, arrastar jogadores para o campo, botão "Salvar escalação". Salva direto no time.

---

## 3. Diferença conceitual

| Aspecto            | Elenco                         | Escalação (atual)     |
|--------------------|--------------------------------|------------------------|
| Escopo             | Por campeonato (snapshot)      | Por time (global)      |
| Prazo              | Sim (opcional no Tournament)  | Não                    |
| Envio explícito    | Sim ("Enviar elenco")         | Não (salvar = gravar)  |
| Travamento         | Sim (por envio ou por data)    | Não                    |
| Snapshot por torneio | TournamentTeamElenco          | Não existe             |

---

## 4. Opções para alinhar Escalação aos campeonatos

### Opção A — Escalação por campeonato (espelhando o Elenco)

- **Ideia:** Cada campeonato pode ter "envio de escalação" com prazo e travamento, igual ao elenco.
- **Modelo de dados:**
  - **Tournament:** opcionalmente `escalacaoDeadlineAt` (e, se quiser, regras tipo "pode alterar escalação até N vezes por fase").
  - **TournamentTeam:** `escalacaoSubmittedAt` (quando o time enviou a escalação daquele campeonato).
  - Nova entidade **TournamentTeamEscalacao** (ou nome similar): snapshot da escalação por campeonato — ex.: `tournamentTeamId`, `formation` (string), e slots (ex.: `teamMemberId`, `lineIndex`, `slotIndex`). Pode ser uma tabela de slots + formação no TournamentTeam, ou tabela separada com vários registros por slot.
- **Fluxo na UI:**
  - Na página de Escalação, além (ou em vez) da "escalação global", listar **campeonatos confirmados** com regras de escalação.
  - Por campeonato: prazo para envio, botão "Enviar escalação" (se permitido), estado "Escalação enviada em [data]" ou "Prazo encerrado — escalação travada".
  - Ao "Enviar escalação", gravar formação + slots no snapshot daquele campeonato e preencher `escalacaoSubmittedAt`.
- **APIs:** análogas ao elenco: GET lista de torneios com flags de escalação (deadline, enviado, travado), POST submit escalação por `tournamentId`, GET escalação por `tournamentId` (snapshot ou atual).
- **Prós:** Consistente com elenco; cada campeonato pode ter escalação oficial e prazo próprio.  
- **Contras:** Mais tabelas e fluxos; necessidade de definir se existe escalação "global" e como ela se relaciona com a por campeonato (ex.: copiar global como rascunho ao abrir por torneio).

### Opção B — Escalação por jogo (partida)

- **Ideia:** Escalação é definida por **jogo** (ex.: Game ou TournamentMatch), não por campeonato inteiro.
- **Modelo:** Ex.: `GameLineup` ou `TournamentMatchLineup` (gameId ou matchId, formation, slots).
- **Fluxo:** Na área do time, listar próximos jogos e permitir "Montar escalação" para cada um até um prazo (ex.: até X horas antes do jogo).
- **Prós:** Muito aderente ao uso em overlay e pré-jogo (cada partida com sua escalação).  
- **Contras:** Diferente do desenho do elenco (que é por campeonato); mais entidades (jogo); prazos e travamento por jogo podem ser mais complexos de configurar no admin.

### Opção C — Manter escalação global + exibição por contexto

- **Ideia:** Manter uma única escalação por time (como hoje). Para campeonatos/jogos, **não** criar envio nem snapshot; usar a escalação global quando precisar exibir "escalação do time" (ex.: em súmula ou overlay).
- **Ajustes possíveis:** Na página de Escalação, apenas informar que "Esta escalação pode ser usada em transmissões e pré-jogo". Opcionalmente listar os campeonatos em que o time está confirmado e avisar que "a escalação abaixo pode ser utilizada nesses campeonatos", sem prazo nem envio por torneio.
- **Prós:** Nenhuma mudança de modelo; implementação simples.  
- **Contras:** Não há "escalação oficial por campeonato" nem prazos/travamento; não replica as regras do elenco.

### Opção D — Híbrido: global + envio por campeonato

- **Ideia:** Manter a escalação **global** do time (para uso geral). Para campeonatos que tiverem regra de "envio de escalação", exibir bloco por campeonato (como no Elenco): prazo, "Enviar escalação" (copia formação + slots atuais para o snapshot daquele torneio), "Escalação enviada em …" ou "Prazo encerrado".
- **Modelo:** Mesmo da Opção A (snapshot por TournamentTeam + formação/slots).
- **Fluxo:** Time monta a escalação na mesma tela (ou usa a global como base). Ao clicar "Enviar escalação" no campeonato X, grava snapshot para X e marca `escalacaoSubmittedAt`. A escalação global continua editável; só o snapshot do campeonato trava.
- **Prós:** Alinha com o padrão do elenco (envio por campeonato, prazo, travamento) e mantém uma escalação geral.  
- **Contras:** Duplicação conceitual (global vs por campeonato); necessidade de decidir de onde pré-preencher ao abrir "escalação do campeonato X" (global ou último snapshot de X).

---

## 5. Resumo da avaliação

- **Elenco:** Regras de campeonato estão claras: prazo, envio, travamento, snapshot por torneio (TournamentTeamElenco), uso em súmulas/listas oficiais. A página de Elenco já lista campeonatos confirmados e permite "Enviar elenco" por torneio.
- **Escalação:** Hoje é apenas por time (global), sem prazo, sem envio por campeonato e sem snapshot. Para alinhar às regras de campeonato seria necessário:
  - Definir **escopo** (por campeonato vs por jogo vs só global).
  - Se for por campeonato (ou híbrido): criar modelo de snapshot (formação + slots por TournamentTeam), campos de prazo/envio no Tournament e TournamentTeam, e fluxo de "Enviar escalação" análogo ao elenco.
  - Replicar na UI o padrão da página de Elenco: blocos por campeonato com prazo, botão de envio e estados de travamento.

Recomendação para **avaliar com o produto/negócio:**  
- Se a necessidade for "escalação oficial por campeonato com prazo e travamento", a **Opção A** ou **Opção D** (híbrido) espelham o elenco e permitem reutilizar o mesmo tipo de regras.  
- Se a necessidade for só "mostrar uma escalação em overlay/pré-jogo" sem regra por campeonato, a **Opção C** basta.  
- Se a necessidade for escalação **por partida** (cada jogo com sua escalação e eventual prazo), a **Opção B** é a que melhor reflete isso.

Nenhuma alteração foi aplicada no código; este documento serve apenas como base para decisão e, em seguida, para um desenho detalhado (schema, APIs e telas) quando for implementar.

---

## 6. Decisão: modelo híbrido (registro)

**Definição acordada:**

- **Elenco:** Mantém como está. O elenco de atletas é de até 24 (equivalente a dois times). Por campeonato, o envio e o travamento do elenco seguem as regras atuais (prazo, "Enviar elenco", snapshot em TournamentTeamElenco).
- **Escalação:** Modelo híbrido:
  - Na escalação, o responsável **só pode movimentar os atletas que já estão travados no elenco** (quando houver contexto de campeonato com elenco enviado/travado). Ou seja, a lista de jogadores disponíveis para arrastar no campo vem do **elenco oficial** daquele campeonato (TournamentTeamElenco), não da lista global de membros do time.
  - A escalação atual (global por time, sem vínculo com campeonato) permanece como está e atende ao uso geral (overlay, pré-jogo).
- **Estado atual:** Considerado adequado. Não é necessária alteração de código no momento; quando houver escalação por campeonato no futuro, a regra a respeitar é: **só atletas do elenco travado** entram na lista arrastável da escalação daquele campeonato.
