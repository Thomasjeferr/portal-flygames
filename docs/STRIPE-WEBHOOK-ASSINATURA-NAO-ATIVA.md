# Stripe: webhook entregue mas assinatura não ativa no painel

## O que está acontecendo

O Stripe entrega o evento `invoice.paid` com **200 OK**, mas na "Minha conta" do projeto continua aparecendo "Você ainda não patrocina nenhum time" e "Nenhuma compra ainda". Ou seja, o endpoint responde 200 mas **não está criando** a assinatura/compra no banco.

## Causas mais prováveis

1. **Subscription no Stripe sem `userId` / `planId` no metadata**  
   O checkout do projeto envia `metadata: { userId, planId }` ao criar a assinatura. Se o evento for de uma assinatura criada por outro meio (ex.: Stripe Dashboard) ou de outra conta, o metadata pode estar vazio e o handler retorna 200 sem fazer nada.

2. **Webhook apontando para outro ambiente**  
   Se a URL do webhook no Stripe for de **preview** (ex.: `https://portal-futvar-xxx.vercel.app/api/webhooks/stripe`) em vez da **produção** (ex.: `https://flygames.app/api/webhooks/stripe`), o código que roda pode ser o mesmo, mas o **banco de dados** pode ser outro (ou inexistente). Aí o handler até encontra userId/planId, mas o `prisma.user.findUnique` / `prisma.plan.findUnique` não acha nada e retorna 200 sem ativar.

3. **Plano inativo ou usuário/plano de outro banco**  
   Se `plan.active` for false ou o usuário/plano não existir no DB que o Vercel usa naquela URL, o handler também retorna 200 sem criar assinatura.

## O que foi adicionado no código

- **Logs** no webhook quando ele **não** ativa a assinatura:
  - `[Stripe] invoice.paid: subscription sem userId ou planId no metadata` → metadata da subscription veio vazio ou sem essas chaves.
  - `[Stripe] invoice.paid: user ou plan não encontrado/inativo` → userId/planId existem no metadata, mas user ou plan não foram encontrados no banco (ou plano inativo).
- **Log de sucesso**: `[Stripe] invoice.paid: assinatura ativada` quando Purchase + Subscription forem criados/atualizados.

## O que fazer agora

1. **Conferir a URL do webhook no Stripe**  
   - Stripe Dashboard → **Developers** → **Webhooks** → endpoint que está recebendo os eventos.  
   - A URL deve ser **exatamente** a da produção (ex.: `https://flygames.app/api/webhooks/stripe`), não de preview.  
   - Se estiver errada, edite ou crie um novo endpoint com a URL de produção e use o **Signing secret** desse endpoint nas variáveis de ambiente de produção.

2. **Fazer deploy** com as alterações atuais (logs + fallback em `payment_intent.succeeded`).

3. **Reenviar o evento** `invoice.paid` no Stripe (ou fazer um novo pagamento de teste).

4. **Ver os logs em produção**  
   - Vercel → projeto → **Logs** (ou **Functions** → escolher a função do webhook).  
   - Filtrar por horário do reenvio.  
   - Você verá um dos logs:
     - `subscription sem userId ou planId no metadata` → subscription no Stripe sem metadata; confira no Stripe se a subscription foi criada pelo checkout do projeto e se tem userId/planId.
     - `user ou plan não encontrado/inativo` → webhook provavelmente está falando com outro banco (URL de preview) ou o plano está inativo no admin.
     - `assinatura ativada` → deu certo; pedir para o usuário atualizar a página da conta.

5. **Garantir que produção usa o mesmo banco**  
   Em **Vercel** → **Settings** → **Environment Variables**, confira se a **Production** tem `DATABASE_URL` (e `STRIPE_WEBHOOK_SECRET`) corretos e se não há outro `DATABASE_URL` só para Preview que estiver sendo usado na URL do webhook.

Depois que a URL do webhook e o ambiente (DB + env) estiverem corretos, o fluxo fica **automático**: todo `invoice.paid` (e o fallback de `payment_intent.succeeded`) que tiver metadata e user/plan válidos ativará a assinatura no painel sem intervenção manual.
