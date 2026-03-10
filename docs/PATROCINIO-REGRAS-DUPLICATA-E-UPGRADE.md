# Regras: Patrocínio – Duplicata e Upgrade

Este documento define as regras para **evitar compra duplicada** de patrocínio e para o **fluxo de upgrade** (troca para um plano maior). Inclui também o **estado atual** de cobrança e acesso ao conteúdo.

---

## 0. Cobrança recorrente e acesso ao conteúdo (implementado)

### 0.1 Cobrança recorrente

**Implementado:** O checkout de patrocínio usa **Stripe Subscription** (cobrança recorrente). Se o cliente cancelar no Stripe, o acesso é revogado (`Sponsor.isActive = false`).

| Pergunta | Resposta |
|----------|----------|
| O patrocínio empresa tem **cobrança recorrente** (renovação automática)? | **Sim.** O checkout usa **Stripe Subscription**. O período segue o `billingPeriod` do plano (monthly, quarterly, yearly). |
| O que o `billingPeriod` do plano faz? | Define o **intervalo de cobrança** no Stripe e o **período de vigência** do patrocínio: ao pagar (e em cada renovação), o `Sponsor` tem `startAt` e `endAt` atualizados (1 mês, 3 meses ou 1 ano). |
| Renovação | O Stripe cobra automaticamente. O webhook `invoice.paid` cria/atualiza o `Sponsor` e estende o `endAt` nas renovações. |

**Conclusão:** Se a regra de negócio for “patrocínio com cobrança recorrente (mensal/trimestral/anual)”, será necessário implementar **Stripe Subscription** (ou outro meio de cobrança recorrente) para o fluxo de patrocínio, em vez de só PaymentIntent.

---

### 0.2 Acesso total ao conteúdo do portal

| Pergunta | Resposta |
|----------|----------|
| O patrocinador empresa pode ter **acesso total** ao conteúdo (jogos, lives, resultados)? | **Sim**, mas só se o **plano** tiver o benefício ativado no admin. |
| Como é definido? | No **SponsorPlan** existe o campo **`grantFullAccess`** (boolean). Se `grantFullAccess === true` e o plano está ativo, quem compra esse plano **e está logado** na hora da compra ganha acesso total. |
| Onde é verificado? | **`hasFullAccess(userId)`** e **`getSponsorMaxScreens(userId)`** em `src/lib/access.ts` exigem **Sponsor** ativo ligado ao pedido (`sponsorOrderId`) com `isActive === true` e `endAt >= hoje`. Cancelar no Stripe revoga o acesso. |

**Condição importante – login na compra:**

- O **SponsorOrder** só guarda **`userId`** quando o usuário está **logado** no momento do checkout.
- Se o patrocinador comprar **sem estar logado**, o pedido fica com `userId = null`. Nesse caso **`hasFullAccess` nunca encontra** esse pedido (ela filtra por `userId`). Ou seja: **acesso total só funciona se a compra for feita logado** (mesma conta que usará o portal).

**Vigência do acesso:**

- Hoje **não** se verifica se o período do **Sponsor** (`endAt`) já expirou. Ou seja: um SponsorOrder pago com plano `grantFullAccess` concede acesso total **sem prazo** (enquanto o plano estiver ativo no admin). O `Sponsor.endAt` é usado para exibição do patrocinador no site (logo, etc.), mas **não** para cortar o acesso ao conteúdo. Se a regra de negócio for “acesso só enquanto o período do patrocínio estiver vigente”, será preciso incluir a vigência (ex.: Sponsor ativo com endAt >= hoje, ou um vínculo Order → Sponsor) na lógica de `hasFullAccess` para patrocínio.

**Resumo:**

- **Acesso total:** sim, desde que (1) o plano tenha `grantFullAccess` no admin, e (2) a compra seja feita **logado** (para o pedido ter `userId`).
- **Expiração do acesso:** hoje o acesso por patrocínio **não** expira com o `endAt` do Sponsor; depende apenas de ter um pedido pago com plano `grantFullAccess`. Definir se isso permanece ou se o acesso deve expirar junto com o período do patrocínio.

---

## 1. Conceitos

- **SponsorOrder:** pedido de patrocínio (formulário + pagamento). Pode estar `pending`, `paid` ou `failed`.
- **Sponsor:** patrocínio ativo no site (criado quando um SponsorOrder é pago). Tem `planId`, `startAt`, `endAt`, `isActive`.
- **Patrocínio ativo:** Sponsor com `isActive: true` e `endAt >= hoje` (ainda dentro do período pago).
- **Mesmo patrocinador:** identificado por **e-mail** (obrigatório no pedido) e, se logado, por **userId**. Para regras de duplicata/upgrade usamos principalmente o **e-mail** (uma empresa pode patrocinar com o mesmo e-mail).

---

## 2. Regras contra duplicata (mesma compra duas vezes)

### 2.1 Objetivo

Impedir que o mesmo patrocinador (mesmo e-mail) compre **de novo o mesmo plano** enquanto já tiver **um pedido pago** para esse plano cujo patrocínio ainda esteja **ativo** (período não acabou).

### 2.2 Definição de “já tem esse plano ativo”

Consideramos que o e-mail **já tem o plano X ativo** quando existe **ao menos um** dos dois:

- **SponsorOrder** com `email` = e-mail do formulário (normalizado), `sponsorPlanId` = plano escolhido, `paymentStatus = 'paid'`, **e** um **Sponsor** criado a partir desse pedido com `endAt >= hoje`; ou
- **Sponsor** ativo (`isActive: true`, `endAt >= hoje`) com `planId` = plano escolhido, **e** cujo pedido de origem (SponsorOrder) tenha `email` = e-mail do formulário.

Na prática: buscar SponsorOrder pago com esse e-mail e esse plano cujo período (calculado pelo `billingPeriod` do plano na época) ainda não terminou, ou buscar Sponsor ativo com esse plano vinculado a um pedido com esse e-mail.

### 2.3 Onde aplicar

- **API POST `/api/sponsor-checkout`:** antes de criar o `SponsorOrder`, verificar se já existe “pedido pago + patrocínio ainda ativo” para o par (e-mail normalizado, sponsorPlanId).  
  - Se existir → retornar **403** com mensagem clara, por exemplo:  
    *"Este e-mail já possui patrocínio ativo do plano [Nome do plano]. Aguarde o fim do período ou use a opção de upgrade na sua conta."*

### 2.4 O que NÃO bloquear

- **Renovação:** quando o patrocínio **já expirou** (`endAt < hoje`), o mesmo e-mail pode comprar de novo o mesmo plano (nova compra = renovação).
- **Outro plano:** o mesmo e-mail pode comprar **outro** plano (ex.: já tem APOIADOR, quer DESTAQUE). Isso será tratado como **upgrade** ou nova compra, conforme a regra de upgrade.
- **Pedidos pendentes:** ter um SponsorOrder `pending` ou `failed` para o mesmo plano não bloqueia novo pedido (pode ser nova tentativa de pagamento).

---

## 3. Regras de upgrade (trocar para um plano maior)

### 3.1 Objetivo

Permitir que quem já tem patrocínio ativo **troque para um plano de valor maior** (upgrade), sem precisar esperar o fim do período e sem criar duplicata de cobrança no mesmo período.

### 3.2 Premissas

- **Ordem de planos:** para definir “maior”, usar o **preço** do plano (ex.: APOIADOR 149 < DESTAQUE 349 < MASTER 899). Opcional: campo `sortOrder` no SponsorPlan (menor = mais básico).
- **Um patrocínio “atual” por e-mail:** consideramos que um e-mail tem **no máximo um** patrocínio “vigente” por vez para efeito de upgrade (o mais recente com endAt >= hoje). Se houver mais de um Sponsor ativo para o mesmo e-mail – edge case – pode-se considerar o de endAt mais distante no futuro como o “atual”.

### 3.3 Cenários

| Cenário | Regra |
|--------|--------|
| **Já tem plano ativo e escolhe plano de preço MAIOR** | Permitir **upgrade**: criar novo pedido (ou fluxo de upgrade) que substitui o patrocínio atual pelo novo plano. Opções: (A) cobrar só a diferença (prorata) ou (B) cobrar o valor integral do novo plano e estender/crédito conforme política. |
| **Já tem plano ativo e escolhe o MESMO plano** | Bloquear com a regra de duplicata (ver acima). |
| **Já tem plano ativo e escolhe plano de preço MENOR** | Tratar como **downgrade**: pode ser permitido apenas no **fim do período** (não troca agora; na renovação escolhe o plano menor). Ou permitir troca imediata sem reembolso (novo plano começa na hora, período atual do antigo é “perdido”). Definir política. |
| **Não tem patrocínio ativo** | Fluxo normal de compra (sem upgrade). |

### 3.4 Fluxo sugerido de upgrade (plano maior)

1. **Identificação:** usuário logado ou e-mail já usado em SponsorOrder pago com Sponsor ativo.
2. **Tela/opção “Fazer upgrade”:** exibir apenas planos com **preço maior** que o plano atual. Botão “Trocar para este plano” (ou “Fazer upgrade”).
3. **Backend – endpoint de upgrade (ex.: POST `/api/sponsor-order/upgrade`):**
   - Recebe: `newSponsorPlanId`, e-mail (ou userId) e, se necessário, `currentSponsorOrderId` ou `currentSponsorId`.
   - Validações:
     - Existir patrocínio ativo para esse e-mail/user com plano de preço menor que o novo plano.
     - Novo plano ativo e com preço maior que o plano atual.
   - Criar **novo SponsorOrder** para o novo plano (status `pending`) e gerar pagamento (Stripe). Opções:
     - **Cobrança integral do novo plano:** próximo período começa na data do pagamento; o período atual do plano antigo pode ser encerrado na data do upgrade ou mantido até endAt (sem duplicar exibição no site).
     - **Prorata (opcional):** cobrar apenas diferença proporcional até o fim do período atual (exige lógica de cálculo e possível integração com gateway).
   - Após pagamento confirmado (webhook):
     - Marcar o **Sponsor antigo** como inativo (`isActive: false`) ou ajustar `endAt` para a data do upgrade.
     - Criar o **novo Sponsor** com o novo plano e novo período (startAt = data do pagamento, endAt conforme billingPeriod do novo plano).
     - Manter o SponsorOrder antigo como `paid` (histórico); o novo SponsorOrder fica `paid` e gera o novo Sponsor.

### 3.5 O que a UI precisa

- **Na conta do usuário (se logado):** se existir SponsorOrder pago vinculado ao userId com patrocínio ativo, mostrar bloco “Seu patrocínio” (plano atual, data fim) e link **“Fazer upgrade”** para uma página que lista apenas planos de preço maior.
- **Na página de planos de patrocínio:** se o usuário já tem patrocínio ativo (por sessão ou por e-mail informado), no card do **plano atual** mostrar “Plano atual” em vez de “Patrocinar Time”; nos planos **maiores** mostrar “Fazer upgrade” em vez de “Patrocinar Time”.
- **Página de upgrade:** lista de planos com preço maior que o atual; ao escolher, chama o endpoint de upgrade e segue para pagamento (cartão). Após sucesso, redirecionar para conta ou página de obrigado.

---

## 4. Resumo das regras

| # | Regra | Onde aplicar |
|---|--------|----------------|
| D1 | Bloquear novo pedido (checkout) quando o **e-mail** já tem **SponsorOrder pago** para o **mesmo plano** com patrocínio ainda **ativo** (endAt >= hoje). | POST `/api/sponsor-checkout` |
| D2 | Mensagem de erro 403: “Este e-mail já possui patrocínio ativo do plano [X]. Aguarde o fim do período ou use a opção de upgrade.” | Resposta da API quando D1 for verdadeiro |
| D3 | Permitir nova compra do **mesmo plano** quando o patrocínio **já expirou** (renovação). | Mesma API: só bloquear quando “ativo” |
| U1 | Oferecer **upgrade** apenas para planos de **preço maior** que o plano atual do patrocinador. | Backend (endpoint de upgrade) + front (listar planos) |
| U2 | Ao confirmar upgrade (pagamento): **desativar** o Sponsor antigo e **criar** novo Sponsor com o novo plano e novo período. | Webhook Stripe ou callback de pagamento + serviço de upgrade |
| U3 | Na conta e na listagem de planos, mostrar “Plano atual” e “Fazer upgrade” quando houver patrocínio ativo. | Frontend (conta, página patrocinar, página de upgrade) |

---

## 5. Detalhes técnicos sugeridos

### 5.1 Checagem de “já tem esse plano ativo” (para duplicata)

Em `/api/sponsor-checkout`, antes de `prisma.sponsorOrder.create`:

1. Normalizar e-mail: `emailNorm = d.email.trim().toLowerCase()`.
2. Buscar Sponsor ativo ligado a esse plano e a esse e-mail:
   - Opção A: buscar `Sponsor` com `planId = d.sponsorPlanId`, `isActive = true`, `endAt >= now`, e existe um SponsorOrder com `email = emailNorm` que deu origem a esse Sponsor (Sponsor não tem email; seria preciso ligar por SponsorOrder → criar Sponsor com algum vínculo ao order, ou buscar Orders pagos com esse email e esse planId e ver se algum tem Sponsor com endAt >= hoje).
   - Opção B (mais simples): buscar **SponsorOrder** com `email = emailNorm`, `sponsorPlanId = d.sponsorPlanId`, `paymentStatus = 'paid'`. Para cada um, o Sponsor criado tem `startAt` e `endAt` no webhook; não temos FK de Sponsor → SponsorOrder. Então: ou guardamos em Sponsor um `sponsorOrderId` (precisa de migration) ou, para cada Sponsor ativo com esse planId, buscamos se existe SponsorOrder com esse email e que foi pago na mesma época (frágil). **Recomendação:** adicionar `sponsorOrderId` opcional em `Sponsor` (FK para SponsorOrder) para ligar “este Sponsor veio deste Order”. Assim: buscar SponsorOrder com email = emailNorm, sponsorPlanId = planId, paymentStatus = 'paid', e cujo Sponsor (via sponsorOrderId) tenha endAt >= hoje. Se não quiser migration: buscar Sponsor com planId e endAt >= hoje e cujo “pedido” tenha esse email – aí precisamos de uma tabela ou campo que ligue Sponsor ao Order (ex.: sponsorOrderId em Sponsor).

Verificar no schema se já existe vínculo Sponsor → SponsorOrder. Pelo schema atual, Sponsor não tem sponsorOrderId; SponsorOrder não tem sponsorId. Então a ligação é “implícita”: o webhook cria o Sponsor após pagar o Order. Para saber “este Sponsor veio deste Order” seria necessário adicionar `sponsorOrderId` em Sponsor (ou `sponsorId` em SponsorOrder). **Recomendação:** adicionar `sponsorOrderId` em Sponsor (nullable, FK para SponsorOrder). Ao criar Sponsor no webhook, preencher esse campo. Na checagem de duplicata: buscar SponsorOrder com email = emailNorm, sponsorPlanId = planId, paymentStatus = 'paid'. Para cada um, buscar Sponsor com sponsorOrderId = order.id; se algum tiver endAt >= hoje → bloqueia.

Simplificação **sem migration** (só com dados atuais): buscar SponsorOrder com email = emailNorm, sponsorPlanId = planId, paymentStatus = 'paid'. Calcular o endAt “esperado” do patrocínio a partir de order.createdAt e do billingPeriod do plano na época (ou do plano atual). Se esse endAt >= hoje → bloqueia. Não é 100% preciso (porque o Sponsor pode ter sido editado manualmente), mas evita migration.

### 5.2 Ordenação de planos para “maior”

- Usar `plan.price` para comparar.
- Se houver `sortOrder` (menor = mais básico), “upgrade” = planos com sortOrder menor que o do plano atual (ou maior, conforme convenção). Preferir **preço** para clareza.

---

## 6. Próximos passos

1. Decidir se haverá migration para `Sponsor.sponsorOrderId` (recomendado para ligar Sponsor ao Order).
2. Implementar regra D1+D2 no `POST /api/sponsor-checkout` (com ou sem migration).
3. Implementar endpoint de upgrade (ex. `POST /api/sponsor-order/upgrade`) e fluxo no webhook (desativar Sponsor antigo, criar novo).
4. Ajustar front: conta, página de planos de patrocínio e nova página/modal de upgrade.
