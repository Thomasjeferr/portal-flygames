# Parceiros: percentual por plano/patrocínio e área do parceiro

Documento de detalhamento **antes** de implementar: onde fica o campo de % para parceiro, onde ele aparece (e onde não aparece) e quando o parceiro ganha em cada modalidade.

---

## 1. Onde fica o campo de percentual (admin)

### 1.1 Quem define o %

- **Hoje:** só o **cadastro do parceiro** (admin): por parceiro você define `planCommissionPercent`, `gameCommissionPercent`, `sponsorCommissionPercent`. Todas as vendas daquele parceiro usam esses %.
- **Depois:** cada **plano** (e cada plano de patrocínio) pode ter um % opcional. Na hora da venda, usa o % do **plano** se estiver preenchido; senão, usa o % do **parceiro**.

### 1.2 Onde o campo aparece (formulários admin)

| Formulário | Campo novo | Comportamento |
|------------|------------|----------------|
| **Planos (assinatura/jogo)** – criar e editar | **"% comissão parceiro (quem indicar)"** (0–100, opcional) | Se preenchido: nas vendas desse plano (assinatura ou jogo avulso) com indicação de parceiro, esse % é usado. Se 0 ou vazio: usa o % do cadastro do parceiro (planCommissionPercent ou gameCommissionPercent). |
| **Planos de patrocínio (SponsorPlan)** – criar e editar | **"% comissão parceiro (quem indicar)"** (0–100, opcional) | Se preenchido: nas vendas desse plano de patrocínio com indicação de parceiro, esse % é usado. Se 0 ou vazio: usa o % do cadastro do parceiro (sponsorCommissionPercent). |

- **Plan:** um único campo basta (vale para tipo `recorrente` e `unitario`). O webhook já diferencia “plano” vs “jogo” pelo `plan.type`; o que muda é só a origem do % (plano ou parceiro).
- **SponsorPlan:** um campo; só existe “patrocínio”.

### 1.3 Onde o % **não** aparece

- **Cards públicos** (páginas **/planos** e **/patrocinar**): **não** exibir “parceiro ganha X%” nem qualquer informação de comissão. O visitante não precisa ver isso. Nenhum card de plano ou de patrocínio mostra percentual para parceiro.

---

## 2. Onde o percentual aparece na área do parceiro

- **Não em cards:** como acima, nada de card público com % de parceiro.
- **Na área do parceiro** (após login, rotas `/parceiro/...`): **pode** aparecer, de forma clara e por modalidade.

### 2.1 Onde mostrar na área do parceiro

- **"Meu link"** (ou uma seção **"Seus percentuais"**): texto fixo explicando quanto o parceiro ganha em cada modalidade, por exemplo:
  - **Planos e assinaturas:** X%
  - **Jogos avulsos:** Y%
  - **Patrocínio:** Z%
- Esses X, Y, Z vêm do **cadastro do parceiro** (o que o admin definiu). Opcional: uma linha do tipo “Quando um plano ou patrocínio tiver percentual próprio, aquele valor é usado naquela venda.”
- **Não** é necessário criar “cards” grandes; pode ser um bloco de texto ou uma lista simples (três linhas) na própria página “Meu link” ou em “Meus dados”.

### 2.2 Quando ele ganha de cada modalidade – exibir o % aplicado

- Em **Indicações** e **Comissões**, cada linha é uma venda (uma indicação) com tipo: “Plano / Jogo” ou “Patrocínio”.
- Hoje já existe, por venda, o **valor da comissão** (quanto ele ganhou). No banco, `PartnerEarning` tem **`commissionPercent`** (o % que foi efetivamente aplicado naquela venda).
- **Detalhe pedido:** em cada linha (cada ganho), **mostrar também o % que foi aplicado** naquela modalidade naquela venda, por exemplo:
  - Coluna **"% aplicado"** ou texto: “Comissão: 10%” ao lado do valor.
- Assim o parceiro vê:
  - **Quando** ganhou (data);
  - **De qual modalidade** (plano/jogo ou patrocínio);
  - **Quanto** ganhou (valor);
  - **Com qual %** (o `commissionPercent` daquele ganho).

Isso atende ao “quando ele ganha de cada modalidade” e “pode aparecer na área do parceiro” sem usar cards, só na listagem de indicações/comissões.

---

## 3. Quando o parceiro ganha em cada modalidade (regra de negócio)

### 3.1 Fluxo geral

1. Cliente acessa o site pelo **link do parceiro** (ex.: `/planos?ref=CODIGO` ou `/patrocinar?ref=CODIGO`).
2. No checkout (plano/jogo ou patrocínio), o **ref** é gravado e o **parceiro** é identificado (`partnerId` na compra ou no pedido de patrocínio).
3. Quando o **pagamento é confirmado** (webhook Stripe/Woovi), o sistema cria um **PartnerEarning** com:
   - valor bruto da venda (base do cálculo),
   - **% aplicado** (regra abaixo),
   - valor da comissão (líquido ao parceiro),
   - status “pendente” (depois o admin pode marcar como pago).

O parceiro **só ganha** quando a venda está **paga**. Não há comissão em pedido pendente ou falho.

### 3.2 Modalidade 1: Planos e assinaturas (plano tipo `recorrente`)

- **Quando:** Cliente compra **assinatura** (plano recorrente) pelo link do parceiro e o pagamento é confirmado.
- **Base do cálculo:** preço do plano (valor da compra), em centavos.
- **% aplicado (depois da mudança):**
  - Se o **plano** tiver campo “% comissão parceiro” preenchido (ex.: 10): usa **10%**.
  - Senão: usa o **% do cadastro do parceiro** em “planos/assinaturas” (`planCommissionPercent`).
- **Resultado:** um `PartnerEarning` com `sourceType: 'purchase'`, valor da comissão = base × (% aplicado / 100). Esse % fica gravado em `commissionPercent` e pode ser exibido na área do parceiro naquela linha.

### 3.3 Modalidade 2: Jogos avulsos (plano tipo `unitario`)

- **Quando:** Cliente compra **jogo avulso** (plano unitário) pelo link do parceiro e o pagamento é confirmado.
- **Base do cálculo:** preço do plano (jogo), em centavos.
- **% aplicado (depois da mudança):**
  - Se o **plano** (do jogo) tiver “% comissão parceiro” preenchido: usa esse %.
  - Senão: usa o **% do cadastro do parceiro** em “jogos avulsos” (`gameCommissionPercent`).
- **Resultado:** mesmo formato de `PartnerEarning` (purchase); na área do parceiro aparece como “Plano / Jogo” e pode mostrar o % aplicado naquela venda.

### 3.4 Modalidade 3: Patrocínio (SponsorPlan)

- **Quando:** Cliente contrata **patrocínio** (escolhe um SponsorPlan) pelo link do parceiro e o pagamento é confirmado.
- **Base do cálculo:** valor pago do pedido de patrocínio (`order.amountCents`).
- **% aplicado (depois da mudança):**
  - Se o **plano de patrocínio** tiver “% comissão parceiro” preenchido: usa esse %.
  - Senão: usa o **% do cadastro do parceiro** em “patrocínio” (`sponsorCommissionPercent`).
- **Resultado:** um `PartnerEarning` com `sourceType: 'sponsor'`. Na área do parceiro aparece como “Patrocínio” e pode mostrar o % aplicado.

---

## 4. Resumo para implementação

| Item | Onde | Detalhe |
|------|------|--------|
| Campo “% comissão parceiro” | Admin: formulário de **Plan** (novo/editar) | Um campo; usado em vendas de assinatura e de jogo avulso quando o plano tiver % definido. |
| Campo “% comissão parceiro” | Admin: formulário de **SponsorPlan** (novo/editar) | Um campo; usado em vendas de patrocínio quando o plano tiver % definido. |
| % em cards públicos | **Não** | Nada em /planos nem /patrocinar. |
| % na área do parceiro | **Sim** | Texto/listagem em “Meu link” (ou “Seus percentuais”): X% planos, Y% jogos, Z% patrocínio (valores do cadastro do parceiro). |
| “Quando ganha de cada modalidade” | Indicações e Comissões | Em cada linha, mostrar o **% aplicado** naquela venda (campo `commissionPercent` do ganho), além do valor. |
| Regra do % | Webhooks (Stripe/Woovi) | Por venda: se o plano (Plan ou SponsorPlan) tiver % parceiro preenchido → usa esse %; senão → usa o % do parceiro (plan/game/sponsor conforme a modalidade). |

Assim o **campo de percentual** fica detalhado (só no admin, não em cards), **aparece na área do parceiro** de forma simples (por modalidade) e fica claro **quando ele ganha de cada modalidade** (com o % aplicado em cada ganho). Quando quiser, podemos aplicar isso no código passo a passo.
