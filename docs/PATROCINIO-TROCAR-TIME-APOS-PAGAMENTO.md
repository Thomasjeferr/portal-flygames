# Patrocínio: escolher time, pagar e depois mudar o time

## Time do coração vs time do patrocínio

- **Time do coração** = campo do **usuário** (`User.favoriteTeamId`). Usado na próxima compra (plano ou patrocínio) como padrão e para exibir “Você patrocina o {time}” na conta.
- **Time do patrocínio** = time vinculado ao **pedido** (`SponsorOrder.teamId`). Define qual time recebe a comissão daquele pedido e em qual time o patrocínio aparece.

### Ao pagar com time escolhido

| Tipo de pagamento | O sistema marca como time do coração? |
|-------------------|----------------------------------------|
| **Plano / assinatura** (checkout) | **Sim.** No checkout já atualiza `User.favoriteTeamId`; quando o pagamento confirma no webhook, atualiza de novo se a compra tiver `teamId`. |
| **Patrocínio** (SponsorOrder)      | **Sim.** No webhook, ao confirmar o pagamento do patrocínio, se `order.userId` e `order.teamId` existirem, o sistema atualiza `User.favoriteTeamId` para `order.teamId`. |

Ou seja: ao pagar patrocínio com time escolhido (e estando logado), o sistema passa a marcar esse time como time do coração, igual ao plano.

### O time do coração é editável na área do usuário?

**Sim.** Na **conta** (`/conta`) existe a seção **“Time do Coração”**: o usuário vê o time atual e pode clicar para **alterar** (escolher outro ou remover). Isso chama `PATCH /api/account/favorite-team` e atualiza `User.favoriteTeamId`. Ou seja, o time do coração **já é editável** pelo usuário a qualquer momento; isso **não** altera o time vinculado a nenhum pedido de patrocínio ou compra já paga (só afeta compras futuras e a exibição na conta).

---

## O que acontece hoje (time do pedido de patrocínio)

### No checkout (patrocinar/comprar)

1. O usuário escolhe o **plano**, preenche dados da empresa e pode escolher um **time** (opcional).
2. O pedido (**SponsorOrder**) é criado com `teamId` e `amountToTeamCents` já definidos (quando o plano repassa % ao time).
3. Após o pagamento (Stripe), o webhook:
   - Marca o pedido como `paymentStatus: 'paid'`.
   - Cria o **Sponsor** (exibição do patrocinador) com `teamId` do pedido.
   - Se havia time e valor para o time, cria **TeamSponsorshipEarning** (comissão pendente para aquele time).
   - Se o pedido tem **userId** e **teamId**, atualiza **User.favoriteTeamId** para esse time (time do coração).

### Depois do pagamento

- **Não existe** fluxo para o usuário **editar o pedido e trocar o time**.
- Na **conta** do usuário aparece que ele patrocina (no contexto de assinatura/plano); não há tela “Meus patrocínios” com botão “Trocar time” para **SponsorOrder**.
- No **admin**, a tela “Pedidos de patrocínio” lista sobretudo pedidos **sem time** (`missingTeam: true`). O admin pode **atribuir um time** só quando:
  - o pedido está **pago**;
  - o pedido **ainda não tem** `teamId`, `amountToTeamCents` nem **TeamSponsorshipEarning**.
- Ou seja: **atribuir time** no admin serve para pedidos que foram pagos **sem** escolher time; não existe “trocar time” para um pedido que já tem time.

### Resumo atual

| Situação | Pode trocar o time? |
|----------|----------------------|
| Usuário escolheu time no checkout e pagou | **Não.** Não há tela nem API para o usuário (ou admin) alterar o time depois. |
| Usuário pagou sem escolher time | Admin pode **atribuir** um time **uma vez** (assign-team). Depois de atribuído, a API não permite trocar. |

---

## Se o usuário pudesse “editar e mudar o time” depois de pagar

### O que está em jogo

1. **SponsorOrder** – `teamId` e `amountToTeamCents` (qual time recebe a comissão e quanto).
2. **Sponsor** – `teamId` (em qual time o patrocínio é exibido).
3. **TeamSponsorshipEarning** – registro de comissão do **time A** para aquele pedido (valor pendente ou já pago no saque).

Se permitirmos trocar o time de **A** para **B**:

- **Exibição** (patrocínio no site): faz sentido passar a mostrar no time B (atualizar **Sponsor** e **SponsorOrder**).
- **Dinheiro**: o **TeamSponsorshipEarning** já foi criado para o time A. Duas abordagens:
  - **Trocar de fato**: remover o earning do time A e criar um novo para o time B. Só é “justo” se o time A ainda **não** tiver usado esse valor (earning ainda `pending` e **não** incluído em **TeamWithdrawal**). Se o time já sacou ou já entrou em pedido de saque, mudar geraria inconsistência (time A já recebeu, time B passaria a ter direito).
  - **Só trocar exibição**: manter o earning no time A (ele continua com direito ao repasse), mas mudar **Sponsor** e **SponsorOrder.teamId** para o time B. O patrocínio “aparece” no time B, mas o repasse financeiro continua com o time A. Confuso para todos.

### Opções recomendadas

| Opção | Regra | Prós / Contras |
|-------|--------|-----------------|
| **A – Não permitir troca** | Mantém como está: depois de pago (com ou sem time), não se altera mais o time. | Simples, sem risco de erro ou injustiça. Usuário precisa escolher certo no checkout. |
| **B – Trocar só se nada foi pago ao time** | Usuário (ou admin) pode trocar o time **somente** se o **TeamSponsorshipEarning** desse pedido estiver `pending` e **não** estiver em nenhum **TeamWithdrawalSponsorshipItem**. Ao trocar: deletar earning do time A, criar earning do time B, atualizar **SponsorOrder** e **Sponsor**. | Justo e previsível. Exige checagem no backend e UI (ex.: “Trocar time” na conta ou no admin, desabilitado se já houver saque). |
| **C – Só admin pode trocar** | Mesma regra da opção B, mas apenas o admin pode fazer a troca (ex.: tela de edição do pedido / “Reatribuir time”), com aviso quando não for mais possível. | Controle total; usuário entra em contato para pedir a mudança. |

---

## Assinatura/plano (Purchase) – para comparar

- Para **compra de plano** (Purchase), existe **“Escolher time”** na conta do usuário: **uma vez** por compra paga que ainda não tem time. Depois de escolhido, a API `/api/me/purchases/[id]/choose-team` retorna erro *“Esta compra já possui time vinculado”* — ou seja, **não há “trocar time”** para compra de plano também.

---

## Renovação do patrocínio (próxima fatura)

Quando existir **cobrança recorrente** de patrocínio (ex.: Stripe Subscription para plano de patrocínio mensal/anual), o comportamento desejado é:

- Na **próxima fatura**, antes de criar a comissão ao time, o sistema deve usar o **time do coração atual** do usuário (`User.favoriteTeamId`), e **não** o time gravado no pedido original.
- Se o usuário tiver **alterado** o time do coração na conta, a comissão daquela fatura vai para o time **novo**.
- Se o usuário tiver **removido** o time do coração (`favoriteTeamId` nulo), **não** se cria **TeamSponsorshipEarning** naquela fatura (nenhum time recebe comissão naquele ciclo).

No código: no webhook que processar a renovação (ex.: `invoice.paid` com metadata de patrocínio), buscar o usuário pelo `userId` do pedido/assinatura, ler `user.favoriteTeamId`; se existir e o plano tiver `teamPayoutPercent > 0`, criar o earning para esse time; se for null, não criar earning. Ver comentário em `src/app/api/webhooks/stripe/route.ts` na parte de `invoice.paid`.

---

## Resumo direto

- **Hoje:** Se o usuário escolhe um time para patrocinar, paga e depois quiser mudar o time, **não há como**. O sistema não oferece essa edição (nem para o usuário nem para o admin, exceto a atribuição única para pedidos que foram pagos sem time).
- **Se quiser permitir:** A abordagem mais segura é a **opção B** (ou C só no admin): permitir troca **apenas** enquanto o repasse ao time ainda não foi pago (earning pendente e não vinculado a saque). Aí o sistema pode remover o earning do time antigo, criar para o novo, e atualizar Sponsor + SponsorOrder.

Se quiser, posso sugerir o desenho da API e da tela (conta ou admin) para “trocar time” dentro dessa regra.
