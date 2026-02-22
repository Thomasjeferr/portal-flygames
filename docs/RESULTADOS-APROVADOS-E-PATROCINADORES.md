# Resultados aprovados: acesso para assinantes e patrocinadores empresa

**Já implementado neste projeto:** alteração no schema (SponsorOrder.userId + relação em User) e função `canAccessApprovedResults` em `src/lib/access.ts`. Falta: migração, checkout gravar userId, fluxo de login em /patrocinar e página /resultados.

## Objetivo

- Página **Resultados aprovados** (súmulas oficiais): só jogos em que **ambos os times** aprovaram a súmula.
- **Quem pode ver:**
  1. Usuários com **assinatura ativa** e plano com **acesso total** (`hasFullAccess`).
  2. Usuários com **patrocínio empresa pago** (SponsorOrder pago vinculado à conta).
- **Quem não pode ver:** quem só comprou 1 jogo (plano unitário), visitantes não logados, usuários sem assinatura nem patrocínio pago.

---

## 1. Schema: vincular pedido de patrocínio ao usuário

**Arquivo:** `prisma/schema.prisma`

No model **SponsorOrder**, adicionar:

```prisma
userId  String?  @map("user_id")  // preenchido quando o usuário está logado ao patrocinar
```

E a relação:

```prisma
user User? @relation(fields: [userId], references: [id], onDelete: SetNull)
```

No model **User**, adicionar na lista de relações:

```prisma
sponsorOrders SponsorOrder[]
```

Depois rodar: `npx prisma migrate dev --name sponsor_order_user_id`

---

## 2. Função de acesso à página de resultados

**Arquivo:** `src/lib/access.ts`

Criar função que reúne as duas regras:

```ts
/**
 * Pode ver a página de Resultados aprovados (súmulas oficiais)?
 * Sim se: assinatura ativa com acesso total OU tem pelo menos um SponsorOrder pago vinculado à conta.
 */
export async function canAccessApprovedResults(userId: string): Promise<boolean> {
  if (await hasFullAccess(userId)) return true;

  const paidOrder = await prisma.sponsorOrder.findFirst({
    where: { userId, paymentStatus: 'paid' },
    select: { id: true },
  });
  return !!paidOrder;
}
```

Assim, quem só tem Purchase de 1 jogo continua sem acesso; quem tem Subscription com acesso total ou SponsorOrder pago vinculado ao userId passa a ter.

---

## 3. Fluxo de patrocínio: onde pedir login/cadastro

**Opção A – Obrigar login antes do checkout (recomendado)**

- Em **`/patrocinar`**: nos botões “Escolher plano” ou “Patrocinar”, em vez de ir direto para `/patrocinar/comprar?planId=...`, redirecionar para:
  - **Se logado:** `/patrocinar/comprar?planId=...`
  - **Se não logado:** `/entrar?redirect=/patrocinar/comprar?planId=...` (ou página que mostre “Crie sua conta ou entre para patrocinar” com link para cadastro e para login).
- Em **`/patrocinar/comprar`**: na página, no início (ou antes de enviar o formulário):
  - Exigir sessão: se não houver usuário logado, redirecionar para `/entrar?redirect=/patrocinar/comprar?planId=...`.
  - Ao chamar `POST /api/sponsor-checkout`, enviar o usuário da sessão (a API lê o cookie/session e grava `userId` no SponsorOrder).

**Opção B – Permitir checkout sem login e depois “claim”**

- Manter checkout sem login; ao criar SponsorOrder, continuar sem `userId`.
- Oferecer depois: “Crie uma conta com o mesmo e-mail do patrocínio para acessar a área de resultados”. No cadastro/login, ao identificar o e-mail de um SponsorOrder pago, vincular esse(s) pedido(s) ao novo userId (ou ao userId já logado). Exige tela e lógica extras (busca por e-mail, confirmação, etc.).

**Recomendação:** Opção A – fluxo mais simples e seguro; o patrocinador já fica com conta e benefício (resultados) desde o primeiro acesso.

---

## 4. Alterações na API de checkout

**Arquivo:** `src/app/api/sponsor-checkout/route.ts`

- Passar a aceitar requisições **com sessão opcional** (ou obrigatória, se seguir Opção A).
- Se houver sessão (`getSession()` retornar usuário), buscar `userId` e gravar em `SponsorOrder.create({ ..., userId: session.userId })`.
- Se não houver sessão e a regra for “obrigatório estar logado”, retornar 401 com mensagem para o cliente redirecionar para login.

**Exemplo (trecho):**

```ts
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession(); // opcional: se quiser obrigar login, verificar e retornar 401
  // ...
  const order = await prisma.sponsorOrder.create({
    data: {
      // ... campos atuais
      userId: session?.userId ?? null,
    },
  });
  // ...
}
```

---

## 5. Página “Resultados aprovados”

- **Rota sugerida:** `/resultados` (ou `/sumulas-oficiais`).
- **Proteção:** Server Component ou middleware:
  - Se não logado → redirecionar para `/entrar?redirect=/resultados`.
  - Se logado e `!canAccessApprovedResults(userId)` → mostrar mensagem “Área exclusiva para assinantes e patrocinadores” + link para `/planos` e para `/patrocinar`.
  - Se logado e `canAccessApprovedResults(userId)` → listar jogos cuja súmula está aprovada pelos dois times (consultar `Game` + `GameSumulaApproval`: dois registros com `status = 'APROVADA'` para o mesmo `gameId`). Exibir placar, link para detalhe (só leitura), etc.

**Consulta (exemplo):**

Jogos com súmula aprovada por ambos:

- Buscar jogos que tenham **duas** aprovações com status `APROVADA` (uma por time).
- Ou: `GameSumulaApproval` agrupado por `gameId` com `count = 2` e todo mundo `APROVADA`.

---

## 6. Resumo da ordem de implementação

1. **Schema:** adicionar `userId` em `SponsorOrder` + relação em `User`; rodar migração.
2. **access.ts:** implementar `canAccessApprovedResults(userId)`.
3. **sponsor-checkout:** passar a gravar `userId` quando houver sessão.
4. **Fluxo patrocinar:** decidir Opção A ou B; se A, exigir login antes de `/patrocinar/comprar` e redirecionar quem não estiver logado.
5. **Página `/resultados`:** criar rota, proteger com `canAccessApprovedResults`, listar jogos com súmula aprovada pelos dois times.

Com isso, a página de resultados fica restrita a assinantes com acesso total e a patrocinadores empresa (com conta vinculada ao pedido pago), e o cadastro antes de patrocinar (Opção A) garante que todo patrocinador empresa possa acessar os resultados pelo login.
