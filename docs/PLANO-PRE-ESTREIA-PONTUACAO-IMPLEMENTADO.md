# Pré-estreia Clubes – um login por time + responsável obrigatório  
## Pontuação: o que já temos x o que falta

---

## 1. Schema e migration

| Item | Status | Observação |
|------|--------|------------|
| PreSaleClubSlot com `teamId` | ❌ Não | Modelo não tem `teamId`. |
| PreSaleClubSlot com `clubViewerAccountId` | ❌ Não | Hoje a FK está em ClubViewerAccount (`preSaleClubSlotId`), relação 1:1. |
| ClubViewerAccount com `teamId` (único) | ❌ Não | Modelo não tem `teamId`. |
| Relação 1:N (uma conta → vários slots) | ❌ Não | Ainda é 1:1: ClubViewerAccount tem `preSaleClubSlotId` único. |
| Backfill slots existentes | — | Só faz sentido após migration. |

**Resumo:** Nenhum dos ajustes de modelo do plano está implementado.

---

## 2. Checkout: só o dono do time pode pagar

| Item | Status | Observação |
|------|--------|------------|
| Página checkout exige login | ❌ Não | `/pre-estreia/[id]/checkout` não verifica sessão; envia só `clubCode`, `responsibleName`, etc. |
| Redirecionar para login com returnUrl | ❌ Não | Não há fluxo de login obrigatório no checkout. |
| API checkout exige sessão (401 se não logado) | ❌ Não | `POST /api/pre-sale/checkout` não chama `getSession()`; qualquer um pode enviar o payload. |
| Obter teamId do slot (slot 1 = home, slot 2 = away) | ❌ Não | API não usa `homeTeamId`/`awayTeamId` do jogo; slot não tem `teamId`. |
| Retornar 400 se time não definido para o slot | ❌ Não | Não implementado. |
| **isTeamOwner(userId, teamId)** (só OWNER ou responsibleEmail) | ❌ Não | Existe **isTeamManager(userId, teamId)** em `access.ts`, mas ele considera **qualquer** TeamManager (incluindo ASSISTANT). Não há função que restrinja a OWNER + responsibleEmail. |
| Retornar 403 se usuário não for dono do time | ❌ Não | Checkout não valida dono do time. |
| Corpo 403 com `message` e `instruction` | ❌ Não | Não existe. |
| Front exibir mensagem/instrução ao receber 403 | ❌ Não | Página não trata 403 nem exibe orientação para usar conta da Área do time. |
| Gravar `teamId` no slot ao atualizar antes do PIX | ❌ Não | Slot não tem campo `teamId`; API não grava. |

**Resumo:** Checkout continua aberto (sem login) e sem validação de “dono do time”. Nada do plano de “só responsável compra” está feito.

---

## 3. Conta clube: um por time

| Item | Status | Observação |
|------|--------|------------|
| createClubViewerAccountForSlot: buscar conta por teamId | ❌ Não | Serviço não usa `teamId`; cria sempre uma conta nova por slot. |
| Se existir conta para o time, vincular slot e não criar User | ❌ Não | Sempre cria User + ClubViewerAccount por slot (1:1). |
| E-mail “Novo jogo disponível – mesmo usuário e senha” | ❌ Não | Sempre envia PRE_SALE_CREDENTIALS com usuário/senha novos. |
| Template ou variante com intro “mesmo login” | ❌ Não | Não existe. |

**Resumo:** Lógica continua “uma conta por slot”; “um login por time” não está implementado.

---

## 4. Iniciar sessão e player

| Item | Status | Observação |
|------|--------|------------|
| start-session: para club_viewer, resolver slot do jogo | ✅ Parcial | Com `useSession` busca ClubViewerAccount por `userId` e `preSaleClubSlot.preSaleGameId = game.id`. Como hoje é 1:1, funciona para um jogo por conta. |
| Suporte a vários slots por conta (1:N) | ❌ Não | Modelo e createClubViewerAccountForSlot são 1:1; start-session não precisa “escolher” entre vários slots ainda. |
| stream-playback / limite de telas | ✅ Sim | Já valida por sessionToken e clubCode; independente do plano. |

**Resumo:** Start-session e player funcionam no modelo atual 1:1; quando existir 1:N, será preciso garantir que o slot resolvido seja o do jogo correto (já coberto pela query por `preSaleGameId` quando a relação for 1:N).

---

## 5. Admin

| Item | Status | Observação |
|------|--------|------------|
| Exibir teamId (ou nome do time) nos slots da pré-estreia | ❌ Não | Slot não tem `teamId`; admin não mostra. |
| Indicar conta compartilhada (mesmo time em vários jogos) | ❌ Não | Não existe conceito de “conta compartilhada” ainda. |
| Regenerar senha: se conta compartilhada, uma senha para todos os jogos do time | ❌ Não | Hoje regenerar é por slot; não há conta compartilhada. |

**Resumo:** Nenhum item do plano de admin para “um login por time” está implementado.

---

## 6. O que já existe e ajuda

| Item | Status | Observação |
|------|--------|------------|
| TeamManager com role OWNER / ASSISTANT | ✅ Sim | Schema tem `role` em TeamManager. |
| Team.responsibleEmail | ✅ Sim | Usado em vários fluxos. |
| isTeamManager(userId, teamId) | ✅ Sim | Considera TeamManager (qualquer role) ou responsibleEmail. **Não** equivale a isTeamOwner (só OWNER + responsibleEmail). |
| isTeamResponsible(userId) | ✅ Sim | Usado no checkout de planos/jogos para bloquear conta de responsável. |
| PreSaleGame.homeTeamId / awayTeamId | ✅ Sim | Jogo já pode ter mandante e visitante. |
| Woovi webhook e markSlotAsPaid | ✅ Sim | Fluxo de pagamento e chamada a createClubViewerAccountForSlot existem. |

---

## 7. Resumo executivo

| Bloco | Implementado | Pendente |
|-------|----------------|----------|
| **Schema / migration** | 0% | teamId no slot e na conta; 1:N (conta → vários slots). |
| **Checkout “só dono”** | 0% | Login obrigatório; isTeamOwner; 403 com message/instruction; gravar teamId no slot. |
| **Um login por time** | 0% | createClubViewerAccountForSlot por teamId; e-mail “novo jogo mesmo login”. |
| **Sessão / player** | ~100% para 1:1 | Para 1:N, só ajustar após mudança de modelo (start-session já usa preSaleGameId). |
| **Admin** | 0% | Exibir time nos slots; conta compartilhada; regenerar senha por conta. |

**Conclusão:** O plano “um login por time + responsável obrigatório” **ainda não está implementado**. O que existe hoje é: checkout **sem login** e **sem checagem de dono do time**; conta clube **1:1 por slot** (cada compra gera novo usuário/senha). As bases (times, OWNER/ASSISTANT, responsibleEmail, home/away no jogo) estão no schema; falta implementar as regras de negócio e o novo modelo de conta por time.
