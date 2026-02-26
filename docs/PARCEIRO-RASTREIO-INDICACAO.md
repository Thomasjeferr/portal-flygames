# Parceiro: como funciona o rastreio da indicação (para não perder a indicação)

Este documento explica **exatamente** como o sistema rastreia a indicação do parceiro, em que momento ela é “travada” e em que situações o parceiro pode perder o crédito.

---

## 1. Fluxo passo a passo (tempo e telas)

| Etapa | O que acontece | Onde o `ref` está |
|-------|----------------|--------------------|
| 1 | Cliente acessa o link do parceiro | URL: `/planos?ref=CODIGO` ou `/patrocinar?ref=CODIGO` |
| 2 | Cliente escolhe plano e clica em “Comprar” / “Assinar” | O botão leva para `/checkout?planId=...&ref=CODIGO` (o `ref` vai na URL) |
| 3 | Na tela de checkout, cliente escolhe Pix ou cartão e clica em pagar | O front chama `POST /api/checkout` com `refCode: CODIGO` no body (lido da URL `?ref=`) |
| 4 | Backend cria a compra (`Purchase`) | Na hora de criar a compra, o sistema resolve o `refCode` no parceiro aprovado e grava `partnerId` na **Purchase** |
| 5 | Cliente paga (Pix ou cartão) | Webhook (Woovi/Stripe) confirma o pagamento |
| 6 | Sistema marca compra como paga e gera comissão | Cria um **PartnerEarning** para o parceiro (valor + %), status “pendente” |

- **Não existe prazo de tempo** para “validade” do `ref`: no momento em que o checkout é enviado com `refCode`, o parceiro é atribuído àquela compra. Depois que a compra é criada com `partnerId`, a indicação **não expira** (a comissão é gerada quando o pagamento for confirmado).
- O que importa é: **no clique em “Pagar” no checkout**, a requisição precisa levar o `refCode` (que vem da URL ou do sessionStorage, se implementado).

---

## 2. Onde o `ref` é lido hoje

- **Página de planos:** `ref = searchParams.get('ref')` na URL; o link para o checkout inclui `&ref=CODIGO`.
- **Checkout:** `refCode: searchParams.get('ref') || undefined` no body do `POST /api/checkout`.

Ou seja: o `ref` é passado pela URL e **também gravado em sessionStorage** quando o usuário entra em `/planos?ref=` ou `/patrocinar?ref=`. No checkout, se o `ref` não estiver na URL, o sistema usa o valor do sessionStorage (mesma aba), para o parceiro não perder a indicação.

---

## 3. Quando o parceiro “perde” a indicação (antes da melhoria)

A indicação é perdida se, **no momento do checkout**, o `ref` não chegar na chamada da API. Isso acontece quando:

- O cliente abre o checkout **sem** o `ref` na URL (ex.: acessou `/checkout` direto, ou voltou por um link que não tem `ref`).
- O cliente foi em `/planos?ref=CODIGO`, mas depois navegou para outra página e entrou no checkout por um link sem `ref` (ex.: “Voltar aos planos” em outra aba sem `ref`).
- O cliente copiou só o link do checkout (sem `ref`) ou abriu o checkout em outro dispositivo/aba sem o mesmo `ref`.

Ou seja: **não é tempo que faz perder**; é **não ter o `ref` na URL (ou no fallback) no momento em que o checkout é enviado**.

---

## 4. Persistência do `ref` em sessionStorage (implementado)

Para o parceiro não perder a indicação quando o `ref` some da URL:

1. **Ao entrar em uma página com `?ref=`** (`/planos?ref=CODIGO` ou `/patrocinar?ref=CODIGO`), o front grava o `ref` no **sessionStorage** (chave `portal_futvar_partner_ref`).
2. **No checkout** (e no envio do patrocínio), ao montar o body da API:
   - Usa primeiro o `ref` da URL (`searchParams.get('ref')`);
   - Se não tiver na URL, usa o `ref` do sessionStorage.

Assim, mesmo que o usuário navegue e o link não tenha `ref`, o sistema ainda envia o último `ref` da sessão (mesma aba). O sessionStorage dura até fechar a aba.

---

## 5. Resumo para o parceiro (o que ele precisa saber)

- **Link correto:** usar sempre o link com `ref` (ex.: `https://site.com/planos?ref=MEUCODIGO`). Esse link está na área do parceiro em “Meu link”.
- **Quando a indicação vale:** no momento em que o cliente **clica em pagar** no checkout com o `ref` ativo (URL ou sessionStorage). Depois que a compra é criada com parceiro vinculado, a indicação fica fixa.
- **Quando o parceiro ganha:** só quando o **pagamento é confirmado** (Pix pago ou cartão aprovado). Aí o sistema gera a comissão (PartnerEarning) e o parceiro vê em Indicações/Comissões.
- **Não há “prazo de X dias”** para o `ref`: não existe expiração por tempo; existe só “ter o `ref` no checkout”.
- **Para não perder:** o cliente deve seguir pelo link do parceiro até o checkout (e não abrir o checkout por outro link sem `ref`). Com a melhoria do sessionStorage, mesmo alguns desvios de navegação na mesma aba ainda mantêm o `ref`.

---

## 6. Onde está no código

| O quê | Onde |
|-------|------|
| Link do parceiro (ref na URL) | `/planos?ref=CODIGO`, `/patrocinar?ref=CODIGO` |
| Leitura do ref na página de planos | `src/app/planos/page.tsx` – `searchParams.get('ref')` e link para checkout com `&ref=` |
| Envio do ref no checkout | `src/app/checkout/page.tsx` – `refCode` da URL ou `sessionStorage.getItem('portal_futvar_partner_ref')` |
| Resolução do ref → partnerId e gravação na compra | `src/app/api/checkout/route.ts` – `refCode` no body, busca Partner por `refCode`, grava `partnerId` na Purchase |
| Criação da comissão (PartnerEarning) | Após pagamento: `wooviPurchaseHandler.ts`, `api/webhooks/stripe/route.ts` (e sponsor-checkout para patrocínio) |
| Listagem de indicações do parceiro | `src/app/api/partner/indicacoes/route.ts`, página `/parceiro/indicacoes` |

Com isso fica explícito o rastreio, o “tempo” (na verdade, o momento do checkout) e como o parceiro evita perder a indicação.
