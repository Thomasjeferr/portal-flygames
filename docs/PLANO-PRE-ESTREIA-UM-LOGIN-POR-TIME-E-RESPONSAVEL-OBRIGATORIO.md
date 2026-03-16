# Plano de ação: Pré-estreia Clubes – um login por time + responsável obrigatório

## Objetivo

1. **Um e-mail e senha por time:** quando o mesmo time se auto-financia em vários jogos, usar **uma única conta de visualização** (club_viewer); nas primeiras compras criar usuário/senha e enviar; nas seguintes apenas vincular o novo jogo à mesma conta e enviar e-mail “Novo jogo disponível. Mesmo usuário e senha.”
2. **Só o dono do time pode comprar:** quem estiver **logado** e for **dono do time** (TeamManager com role OWNER ou e-mail = Team.responsibleEmail) pode comprar o slot da pré-estreia; slot 1 = time mandante, slot 2 = time visitante. Assistente (ASSISTANT) **não** pode pagar.

---

## Análise do estado atual

| Aspecto | Hoje |
|--------|------|
| **Checkout** | Qualquer um com o código do clube pode preencher e pagar; **não exige login**. |
| **Conta clube** | Uma **User** (club_viewer) + **ClubViewerAccount** por **slot** (1:1 com PreSaleClubSlot). Cada jogo novo = novo usuário/senha. |
| **Vínculo time** | PreSaleGame tem homeTeamId e awayTeamId (opcionais). Slot 1 = mandante, slot 2 = visitante. PreSaleClubSlot **não** tem teamId. |
| **Acesso ao assistir** | Por usuário/senha de clube ou por assinatura; sessão por clubCode + sessionToken. |

---

## Garantia: só o dono do time pode pagar (times se auto-financiam)

Em **pré-estreia auto-financiamento** (Clubes), **somente o dono do time** pode comprar o slot daquele time. Assistentes (TeamManager com role ASSISTANT) **não** podem pagar.

- **Quem pode pagar o slot 1:** somente a conta que é **dono do time mandante** daquele jogo (preSaleGame.homeTeamId). Ou seja: usuário com **TeamManager** naquele time com **role = OWNER**, ou usuário cujo e-mail é o **Team.responsibleEmail** do time (responsável cadastral).
- **Quem pode pagar o slot 2:** somente a conta que é **dono do time visitante** daquele jogo (preSaleGame.awayTeamId). Mesma regra: OWNER ou e-mail = responsibleEmail.

**Não podem pagar:** usuários não logados; usuários logados que não são donos de nenhum dos dois times; **assistentes** (TeamManager com role ASSISTANT); responsáveis de **outros** times; contas apenas de assinante/patrocinador sem vínculo de dono com mandante ou visitante.

Essa regra deve ser aplicada **sempre** no checkout (API e, na UI, exigir login antes de permitir pagamento). O admin deve garantir que todo jogo de pré-estreia clubes tenha **mandante e visitante** cadastrados; caso contrário o checkout pode ser bloqueado até que os times estejam definidos.

---

## Regra de negócio: quem pode comprar (detalhe técnico)

- **Exigir sessão** no checkout (usuário logado).
- **Exigir que o usuário seja dono do time** correspondente ao slot **desse jogo**:
  - **Slot 1** → time **mandante** (preSaleGame.homeTeamId).
  - **Slot 2** → time **visitante** (preSaleGame.awayTeamId).
- **Somente dono:** usar uma função que considere **apenas** (1) **TeamManager** com **role = OWNER** para aquele teamId, ou (2) e-mail do usuário = **Team.responsibleEmail** do time aprovado. **Não** considerar TeamManager com role ASSISTANT. Na implementação: criar `isTeamOwner(userId, teamId)` ou ajustar a checagem no checkout para filtrar por `role === 'OWNER'` e responsibleEmail.
- Se o jogo **não tiver** homeTeamId ou awayTeamId no slot em questão, **bloquear** o checkout com mensagem do tipo: “Este jogo precisa ter time mandante e visitante definidos para compra. Entre em contato com o administrador.”

---

## Mensagem quando a conta não é do responsável (conta pessoal)

Se o usuário estiver **logado com uma conta pessoal** (assinante, patrocinador ou qualquer conta que **não** seja responsável do time mandante ou visitante daquele jogo), o sistema deve **bloquear o pagamento** e exibir uma **mensagem explícita** orientando como concluir a compra:

- **API:** ao retornar 403 (não é responsável do time do slot), enviar no corpo da resposta, por exemplo:
  - **message:** "Para comprar o slot da pré-estreia, é necessário usar a conta de responsável pelo time (mandante ou visitante deste jogo). A conta com a qual você está logado não é responsável por nenhum dos times desta pré-estreia."
  - **instruction:** "Faça logout e entre com o e-mail que você usa para acessar a Área do time no portal (painel do clube). Se você ainda não cadastrou o time, cadastre primeiro e aguarde a aprovação. Se o responsável for outra pessoa, ela deve fazer login com a conta dela para efetuar o pagamento."

- **Front (página de checkout):**
  - Ao receber 403 da API, exibir em destaque (caixa de aviso acima do formulário) a mensagem e a instrução retornadas.
  - Texto sugerido na interface: "Esta conta não é de responsável pelo time. Para efetuar o pagamento da pré-estreia, use a conta com a qual você acessa a Área do time (painel do clube). Se for outra pessoa o responsável pelo time, ela deve fazer login e realizar a compra."

Assim, quem estiver usando conta pessoal por engano recebe instrução clara para trocar de conta ou passar a compra para o responsável correto.



---

## Identidade “um login por time”

- **Chave:** `teamId` (o time que “donou” o slot: mandante no slot 1, visitante no slot 2).
- **Conta clube:** uma **ClubViewerAccount** por **teamId** (não mais uma por slot). Um mesmo ClubViewerAccount pode ter **vários** PreSaleClubSlot (vários jogos).
- Ao pagar um slot:
  - Obter `teamId` do jogo (slot 1 → homeTeamId, slot 2 → awayTeamId).
  - Se já existir **ClubViewerAccount** com esse `teamId`: **não** criar nova User; **vincular** o slot a essa conta (atualizar PreSaleClubSlot.clubViewerAccountId) e enviar e-mail “Novo jogo disponível. Use o mesmo usuário e senha de clube.”
  - Se não existir: criar User (club_viewer) + ClubViewerAccount com `teamId` e vincular o slot; enviar e-mail com usuário e senha (como hoje, template PRE_SALE_CREDENTIALS).

---

## Ajustes de modelo de dados (Prisma)

1. **PreSaleClubSlot**
   - Adicionar `teamId` (String?, opcional) para indicar qual time “comprou” o slot (preenchido no checkout a partir de homeTeamId/awayTeamId).
   - Adicionar `clubViewerAccountId` (String?, opcional) em vez de relação 1:1 inversa. Vários slots podem apontar para a mesma ClubViewerAccount.

2. **ClubViewerAccount**
   - Trocar relação com PreSaleClubSlot de 1:1 para **1:N**: um ClubViewerAccount tem vários PreSaleClubSlot (por `clubViewerAccountId` no slot).
   - Remover `preSaleClubSlotId` único; adicionar **teamId** (String?, único) para identificar a conta pelo time. Opcional: manter um “slot principal” para loginUsername se quiser (ou gerar login por time, ex.: `clube-{teamId-slug}-{suffix}`).
   - Manter `userId` (User única por conta) e `loginUsername` (único global).

Migrações: criar `team_id` em PreSaleClubSlot; criar `team_id` em ClubViewerAccount; em ClubViewerAccount trocar `pre_sale_club_slot_id` (unique) por relação inversa em PreSaleClubSlot (`club_viewer_account_id`). Backfill: slots já existentes podem ficar com teamId null e clubViewerAccountId preenchido como hoje (1:1); novos fluxos usam teamId e 1:N.

---

## Fluxo de checkout (alterações)

1. **Front: página `/pre-estreia/[id]/checkout`**
   - Verificar se há sessão (ex.: chamar GET /api/auth/me). Se não houver, redirecionar para login com `redirect=/pre-estreia/[id]/checkout?code=XXX` (e exibir mensagem: “Faça login com a conta de responsável do time para comprar.”).
   - Enviar credenciais (cookie) na requisição POST do checkout.

2. **API POST /api/pre-sale/checkout**
   - Exigir sessão; se não houver, retornar 401.
   - Carregar slot + preSaleGame (com homeTeamId, awayTeamId).
   - Definir `teamIdForSlot = slot.slotIndex === 1 ? game.homeTeamId : game.awayTeamId`. Se `teamIdForSlot` for null, retornar 400 (“Jogo sem time definido para este slot.”).
   - Chamar **isTeamOwner(session.userId, teamIdForSlot)** (apenas OWNER ou responsibleEmail). Se false, retornar **403** com corpo contendo `message` e `instruction` (ver seção “Mensagem quando a conta não é do responsável”) para o front exibir a orientação.
   - (Opcional) Pré-preencher nome/e-mail do responsável com os dados do usuário logado (ou do time) para não deixar outro e-mail.
   - Ao atualizar o slot antes de gerar o PIX, gravar também `teamId: teamIdForSlot` no slot (para o webhook usar depois).

---

## Fluxo pós-pagamento (webhook + conta clube)

1. **Webhook Woovi** (já chama `markSlotAsPaid` e `createClubViewerAccountForSlot`).
   - Garantir que o slot tenha `teamId` preenchido (foi setado no checkout). Se não tiver (slot antigo), usar homeTeamId/awayTeamId do jogo conforme slotIndex.

2. **createClubViewerAccountForSlot (refatorar)**
   - Entrada: slotId (slot já PAID).
   - Buscar slot com preSaleGame (homeTeamId, awayTeamId) e definir `teamId = slot.teamId ?? (slot.slotIndex === 1 ? game.homeTeamId : game.awayTeamId)`.
   - Se já existir **ClubViewerAccount** com esse `teamId`:
     - **Não** criar nova User.
     - Atualizar **PreSaleClubSlot** com `clubViewerAccountId = existingAccount.id`.
     - Enviar e-mail “Novo jogo disponível” (mesmo usuário/senha; pode ser template novo ou PRE_SALE_CREDENTIALS com texto alternativo) para o responsável do slot (e admin se configurado). **Não** enviar nova senha (a conta já existe).
   - Se não existir:
     - Criar User (club_viewer) + ClubViewerAccount com `teamId` e **um** PreSaleClubSlot vinculado (este slot). loginUsername pode ser `clube-{teamSlug}-{shortId}` ou similar, único.
     - Enviar e-mail com usuário e senha (PRE_SALE_CREDENTIALS) como hoje.
   - Marcar `credentialsSentAt` no slot em ambos os casos.

---

## Acesso ao assistir (sessão e player)

- Hoje: sessão por clubCode + sessionToken; o player valida se o usuário (club_viewer) tem acesso àquele jogo via slot.
- Com 1:N: um usuário club_viewer pode ter **vários slots** (vários jogos). Na hora de **iniciar sessão** (POST /api/pre-sale/start-session):
  - Se o usuário for club_viewer, buscar **ClubViewerAccount** pelo userId; listar **PreSaleClubSlot** com `clubViewerAccountId = account.id` e `preSaleGameId = game.id`. Se existir algum slot (e estiver PAID), gerar sessionToken com o clubCode **desse slot** (ou um clubCode único por conta/jogo, conforme implementação atual).
- **Stream-playback** e **heartbeat** continuam validando por sessionToken e clubCode; desde que o token tenha sido gerado para um slot válido daquele jogo, o acesso segue igual.

---

## Resumo do plano de ação (checklist)

- [ ] **Schema e migration**
  - [ ] PreSaleClubSlot: adicionar `teamId` (opcional), adicionar `clubViewerAccountId` (opcional); remover ou ajustar relação 1:1 com ClubViewerAccount.
  - [ ] ClubViewerAccount: adicionar `teamId` (opcional, único); mudar para 1:N com PreSaleClubSlot (slot tem FK para account). Ajustar loginUsername para ser único por conta (ex.: por teamId) na primeira criação.
  - [ ] Backfill: slots existentes manter comportamento atual (um account por slot) ou preencher teamId a partir de home/away do jogo onde possível.

- [ ] **Checkout: só o dono do time pode pagar**
  - [ ] Página checkout: exigir login; redirecionar para entrar com returnUrl; enviar credentials no POST.
  - [ ] API checkout: validar sessão (401 se não logado); obter teamId do slot (slot 1 = homeTeamId, slot 2 = awayTeamId); retornar 400 se time não definido para esse slot; usar **isTeamOwner(userId, teamId)** (apenas OWNER ou responsibleEmail), retornar 403 se false; gravar teamId no slot ao atualizar dados antes do PIX.
  - [ ] **Implementar isTeamOwner:** retornar true se (1) TeamManager com userId e teamId e role = OWNER, ou (2) user.email = Team.responsibleEmail do time aprovado; não considerar ASSISTANT.
  - [ ] **403 (conta pessoal):** API retornar `message` e `instruction` no corpo; front exibir em destaque a mensagem e a instrução para usar a conta da Área do time (dono) ou o dono fazer login (ver seção "Mensagem quando a conta não é do responsável").

- [ ] **Conta clube: um por time**
  - [ ] Refatorar createClubViewerAccountForSlot: buscar ou criar ClubViewerAccount por teamId; se existir, vincular slot à conta e enviar e-mail “novo jogo, mesmo usuário/senha”; se não, criar User + ClubViewerAccount com teamId e enviar credenciais.
  - [ ] Template de e-mail “Novo jogo disponível – mesmo usuário e senha” (ou variante do PRE_SALE_CREDENTIALS com intro_text diferente).

- [ ] **Iniciar sessão e player**
  - [ ] start-session: para usuário club_viewer, resolver qual slot (e clubCode) usar para aquele jogo (slot do mesmo clubViewerAccount e mesmo preSaleGameId).
  - [ ] Garantir que stream-playback e limite de telas continuem funcionando (por slot ou por conta, conforme regra desejada).

- [ ] **Admin**
  - [ ] Em pré-estreia (detalhe do jogo), ao exibir slots, mostrar teamId quando houver (nome do time) e indicar se a conta é compartilhada (mesmo time em vários jogos).
  - [ ] Regenerar senha: se a conta for compartilhada (vários slots), regenerar uma vez e notificar que vale para todos os jogos daquele time.

---

## Ordem sugerida de implementação

1. Migration e schema (teamId no slot; clubViewerAccountId no slot; teamId e 1:N em ClubViewerAccount).
2. Checkout: exigir login + isTeamOwner (só dono: OWNER ou responsibleEmail) para o time do slot; gravar teamId no slot.
3. Refatorar createClubViewerAccountForSlot para “um por time” e e-mail “novo jogo, mesmo login”.
4. Ajustar start-session (e se necessário stream-playback) para resolver slot quando o usuário é club_viewer com vários slots.
5. Ajustes de admin e regenerar senha (opcional na primeira entrega).

Quando quiser, podemos detalhar a migration e os trechos de código (checkout, club-viewer, start-session) passo a passo.
