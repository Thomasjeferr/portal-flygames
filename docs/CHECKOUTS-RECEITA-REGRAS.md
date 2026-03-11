# Checkouts e receita – regras críticas

Este documento descreve **todos os fluxos onde a receita é gerada**. Um erro aqui = pagamento não concluído = perda de receita. **Não altere checkouts sem seguir as regras abaixo.**

---

## Regra de ouro (cartão)

**Quando a API retorna `clientSecret` (Stripe), a página DEVE mostrar o formulário de cartão (Stripe Elements / CardPaymentScreen).**

- **NUNCA** mostrar a mensagem "O pagamento com cartão está em configuração" ou o botão "Falar no WhatsApp" quando já existe `clientSecret`.
- A mensagem + WhatsApp são **apenas fallback** quando não há `clientSecret` (ex.: Stripe indisponível ou fluxo sem cartão).

---

## Fluxos de receita (checkouts)

| # | Fluxo | Rota / página | API | O que deve acontecer |
|---|--------|----------------|-----|------------------------|
| 1 | **Planos e jogos** (assinatura + jogo avulso) | `/checkout` | `POST /api/checkout` | Se `method === 'card'` e resposta tem `clientSecret` → guardar em estado e renderizar **CardPaymentScreen**. Sem cartão disponível → PIX ou mensagem de indisponibilidade. |
| 2 | **Patrocínio** (torcedor / empresa) | `/patrocinar/comprar` | `POST /api/sponsor-checkout` | Se resposta tem `clientSecret` → renderizar **CardPaymentScreen** (com `plan`, `clientSecret`, `onBack`). Se **não** tem `clientSecret` (step payment) → mostrar fallback "em configuração" + botão WhatsApp. |
| 3 | **Trocar plano** (upgrade/downgrade) | `/conta/trocar-plano` | `POST /api/subscription/change-plan` | Se resposta tem `clientSecret` → renderizar **CardPaymentScreen**. Não há fallback "em configuração" neste fluxo. |
| 4 | **Apoiar time (meta)** – admin | `/admin/torneios/[id]/apoiar-time` | `POST /api/tournament-goal/checkout` | Se tem `clientSecret` → formulário Stripe (Elements). Se não → tela de erro "Não foi possível iniciar a assinatura". |
| 5 | **Apoiar time** – público | `/torneios/[slug]/apoiar` | `POST /api/tournament-goal/checkout` | Idem ao anterior. |
| 6 | **Pagar inscrição torneio** – admin | `/admin/torneios/[id]/pagar-inscricao` | `POST /api/tournament-registration/checkout` | Se tem `clientSecret` → formulário Stripe. Se não → tela de erro. |
| 7 | **Pagar inscrição campeonato** – painel time | `/painel-time/times/[id]/campeonatos/pagar` | `POST /api/tournament-registration/checkout` | Idem. |

---

## Arquivos críticos (não quebrar)

- **Front (quando mostrar cartão):**
  - `src/app/checkout/page.tsx` – estado `stripeSecret` → CardPaymentScreen
  - `src/app/patrocinar/comprar/page.tsx` – `clientSecret` + `plan` → CardPaymentScreen; sem clientSecret no step payment → fallback WhatsApp
  - `src/app/conta/trocar-plano/page.tsx` – `clientSecret` + `planName` → CardPaymentScreen
  - `src/components/checkout/CardPaymentScreen.tsx` – componente único do formulário de cartão (Stripe)
- **APIs que devolvem clientSecret:**
  - `src/app/api/checkout/route.ts` – planos/jogos
  - `src/app/api/sponsor-checkout/route.ts` – patrocínio
  - `src/app/api/subscription/change-plan/route.ts` – trocar plano
  - `src/app/api/tournament-goal/checkout/route.ts` – apoiar time (meta)
  - `src/app/api/tournament-registration/checkout/route.ts` – pagar inscrição
- **Lib de pagamento:**
  - `src/lib/payments/stripe.ts` – criação de PaymentIntent / Subscription

---

## Checklist antes de cada deploy

- [ ] Rodar `npm run build` localmente (evita erro de tipo em produção).
- [ ] Se alterou qualquer arquivo em `src/app/checkout`, `src/app/patrocinar/comprar`, `src/app/conta/trocar-plano`, `src/components/checkout` ou `src/app/api/*checkout*`, `src/app/api/sponsor-checkout`, `src/app/api/subscription/change-plan`:
  - [ ] Confirmar: quando a API retorna `clientSecret`, a tela exibe o **formulário de cartão** (CardPaymentScreen ou Elements), não a mensagem "em configuração".
- [ ] Testar em um fluxo real (ex.: patrocínio ou checkout de plano) em ambiente de teste/staging se possível.

---

## Histórico de correções (receita)

- **Patrocínio:** a página `/patrocinar/comprar` exibia "em configuração" + WhatsApp mesmo quando a API devolvia `clientSecret`. Corrigido para renderizar `CardPaymentScreen` quando há `clientSecret`, e fallback WhatsApp apenas quando não há.
- **access.ts:** tipo `readonly` no `OR` do Prisma causava falha no build; removido `as const` do array para compatibilidade com `SponsorOrderWhereInput`.
