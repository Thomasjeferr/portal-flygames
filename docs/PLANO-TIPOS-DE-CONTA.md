# Plano: Distinção dos tipos de conta para o usuário

Objetivo: deixar claro para o usuário **que tipo de conta** ele está usando (Pessoal, Patrocinador torcedor, Responsável pelo time, Patrocínio empresarial), usando parâmetros já existentes no sistema e exibindo essa informação de forma consistente.

---

## 1. Os três (quatro) tipos de conta

| Tipo | Nome para exibição | Descrição resumida |
|------|--------------------|--------------------|
| **Pessoal** | Conta pessoal | Usuário cadastrado que ainda não tem assinatura nem patrocínio empresa ativo. Pode comprar planos/jogos e patrocinar. |
| **Patrocinador torcedor** | Patrocinador torcedor | Tem assinatura ativa (plano recorrente tipo torcedor). Aparece no bloco "Plano Patrocinador/Torcedor". |
| **Responsável pelo time** | Responsável pelo time | Conta usada para gestão de time(s) no painel. **Não pode** comprar nem patrocinar com esta conta. |
| **Empresarial** | Patrocínio empresarial | Tem pelo menos um patrocínio empresa ativo (SponsorOrder pago + Sponsor ativo com `planType === 'sponsor_company'`). |

Regra importante: **uma conta é ou “Responsável pelo time” ou “Conta cliente”** (pessoal / patrocinador torcedor / empresarial). Quem é responsável não pode ser patrocinador na mesma conta; quem já tem compras não pode cadastrar time como responsável com esse e-mail.

---

## 2. Parâmetros para identificar cada tipo

### 2.1 Responsável pelo time

- **Fonte:** `isTeamResponsible(userId)` em `src/lib/access.ts`.
- **Lógica:** `TeamManager` com esse `userId` **ou** `Team` aprovado com `responsibleEmail` igual ao e-mail do usuário.
- **Já exposto:** em `/api/auth/me` como `isTeamManager` (nome no response; no backend é `isTeamResponsible`).
- **Uso:** Se `isTeamManager === true` → tipo **Responsável pelo time**. Esta conta não pode ter assinatura/patrocínio na prática (bloqueado no checkout e no sponsor-checkout).

### 2.2 Patrocinador torcedor

- **Fonte:** `Subscription` do usuário ativa.
- **Lógica:** `Subscription` com `userId`, `active === true`, `endDate >= hoje` e plano do tipo recorrente (em geral plano com `type === 'sponsor_fan'` ou equivalente no `Plan`; no caso do sponsor é o plano de assinatura vinculado à Subscription).
- **Já exposto:** em `/api/account` (`subscription`) e em `/api/auth/me` (`subscription.active`, `subscription.plan`).
- **Uso:** Se a conta **não** for responsável pelo time e existir assinatura ativa (e o plano for de patrocínio torcedor) → tipo **Patrocinador torcedor**.

### 2.3 Patrocínio empresarial

- **Fonte:** `SponsorOrder` com `paymentStatus === 'paid'` + `Sponsor` ativo vinculado ao pedido, com `planType === 'sponsor_company'`.
- **Lógica:**  
  - Pedidos: `SponsorOrder` onde `userId` ou `email` = usuário atual, `paymentStatus = 'paid'`.  
  - Para cada pedido, verificar se existe `Sponsor` com `sponsorOrderId` = id do pedido, `isActive === true`, `endAt >= hoje` (ou equivalente), e `planType === 'sponsor_company'`.
- **Já exposto:** em `/api/account` em `sponsorOrders`, com `sponsor` e `sponsorPlan`; no front da conta já se usa `sponsorOrders` e badge "Empresarial" quando `planType === 'sponsor_company'`.
- **Uso:** Se a conta **não** for responsável pelo time e existir pelo menos um patrocínio empresa ativo (conforme acima) → tipo **Patrocínio empresarial**.

### 2.4 Pessoal

- **Fonte:** ausência dos outros tipos (ou “default” quando não se enquadra nos demais).
- **Lógica:** Conta **não** é responsável pelo time **e** (não tem assinatura ativa de patrocínio torcedor **e** não tem patrocínio empresarial ativo). Pode ter compras avulsas (jogos) e ainda ser “Pessoal” se não tiver assinatura nem empresa ativa.
- **Uso:** Quando nenhum dos critérios acima (responsável, patrocinador torcedor, empresarial) for verdadeiro → tipo **Conta pessoal**.

---

## 3. Prioridade / “tipo principal” (uma conta por e-mail)

Como uma conta é **ou** responsável **ou** cliente:

- **Se `isTeamResponsible(userId) === true`**  
  → Tipo exibido: **Responsável pelo time** (único; não exibir “Patrocinador torcedor” nem “Empresarial” para essa conta, pois o sistema já bloqueia compras/patrocínio).

- **Caso contrário (conta cliente):**  
  Pode ter até dois “subtipos” ao mesmo tempo:
  - Patrocinador torcedor (assinatura ativa).
  - Patrocínio empresarial (sponsor empresa ativo).  
  Assim, podemos exibir:
  - **Um único rótulo** “Conta cliente” e, em segundo plano, “Patrocinador torcedor” e/ou “Patrocínio empresarial”, **ou**
  - **Dois badges** quando aplicável: “Patrocinador torcedor” e “Patrocínio empresarial” (e, se não tiver nenhum dos dois, “Conta pessoal”).

Resumo dos parâmetros para exibição:

| Tipo exibido | Condição (parâmetros) |
|--------------|------------------------|
| Responsável pelo time | `isTeamManager === true` (vindo de `isTeamResponsible`) |
| Patrocinador torcedor | `!isTeamManager && subscription ativa` (e plano de assinatura torcedor) |
| Patrocínio empresarial | `!isTeamManager && existe sponsorOrder pago com Sponsor ativo e planType === 'sponsor_company'` |
| Conta pessoal | `!isTeamManager && !subscription ativa && !patrocínio empresa ativo` |

---

## 4. Onde obter os dados (APIs)

- **`/api/auth/me`**  
  - Já retorna: `isTeamManager` (mapear de `isTeamResponsible`), `subscription` (active, plan).  
  - Pode ser estendido para incluir um campo como `accountType: 'personal' | 'fan_sponsor' | 'team_responsible' | 'company_sponsor'` e, se desejado, `accountTypeLabels: string[]` para múltiplos badges, calculados no backend com a lógica acima.

- **`/api/account`**  
  - Já retorna: `subscription`, `sponsorOrders` (com `sponsor`, `sponsorPlan` e `planType`).  
  - Dá para derivar no front “tem patrocínio empresarial ativo” percorrendo `sponsorOrders` (paymentStatus paid, sponsor ativo, planType empresarial) ou centralizar isso em um novo campo, por exemplo `hasActiveCompanySponsor: boolean` ou `accountType`/`accountTypeLabels`, para evitar lógica duplicada.

Recomendação: **centralizar a definição do(s) tipo(s) no backend** (em `/api/auth/me` e/ou `/api/account`) e expor:
- `accountType: 'team_responsible' | 'personal' | 'fan_sponsor' | 'company_sponsor'` (um principal), e opcionalmente  
- `accountTypeLabels: ['Patrocinador torcedor', 'Patrocínio empresarial']` quando houver mais de um subtipo na conta cliente.

---

## 5. Onde e como exibir (sugestão – só plano, sem implementar ainda)

1. **Header / menu do usuário (avatar ou dropdown)**  
   - Sempre visível: um **badge** ou texto curto com o tipo principal.  
   - Ex.: “Responsável pelo time” ou “Conta pessoal” ou “Patrocinador torcedor” ou “Patrocínio empresarial”.  
   - Se usarmos dois badges para conta cliente: “Patrocinador torcedor” e “Patrocínio empresarial” quando ambos se aplicarem.

2. **Página Minha conta (`/conta`)**  
   - Card ou bloco no topo (ex. “Sua conta”):  
     - “Você acessa como: **[tipo principal]**” (e, se houver, os subtipos em badges).  
     - Lista curta do que a conta pode fazer (ex.: “Assistir jogos”, “Gerenciar time X”, “Patrocínio empresa Y”), derivada do(s) tipo(s).

3. **Consistência**  
   - Usar os **mesmos rótulos** em todo o produto (header, conta, mensagens de bloqueio):  
     - Responsável pelo time | Conta pessoal | Patrocinador torcedor | Patrocínio empresarial.

4. **Acessibilidade**  
   - Incluir o tipo de conta em `aria-label` ou texto alternativo onde fizer sentido (ex.: no botão do menu do usuário).

---

## 6. Resumo dos parâmetros (checklist para implementação)

- [ ] **Responsável pelo time:** usar `isTeamResponsible(userId)` (já exposto como `isTeamManager` em `/api/auth/me`).
- [ ] **Patrocinador torcedor:** usar `Subscription` ativa do usuário (já em `/api/account` e `/api/auth/me`).
- [ ] **Patrocínio empresarial:** usar `SponsorOrder` pago + `Sponsor` ativo com `planType === 'sponsor_company'` (dados já em `/api/account` via `sponsorOrders`).
- [ ] **Pessoal:** quando não for responsável e não tiver assinatura ativa nem patrocínio empresa ativo.
- [ ] **Backend:** definir e retornar `accountType` (e opcionalmente `accountTypeLabels`) em `/api/auth/me` e/ou `/api/account`.
- [ ] **Front:** exibir tipo no header (badge/texto) e no topo da página Minha conta, usando sempre os mesmos rótulos.

Este documento serve apenas como **plano**; a implementação (código) será feita em seguida, quando for aprovado.
