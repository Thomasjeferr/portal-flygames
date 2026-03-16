# Sugestões: card de receita e vendas aprovadas

Objetivo: melhorar o card **Receita do mês** no dashboard e ter um lugar claro para **quem comprou**, **quem pagou** e **vendas aprovadas**.

---

## Dados que já existem no sistema

- **Purchase (planos/jogos avulsos):** `user` (quem comprou/pagou), `plan`, `amountCents`, `paymentStatus`, `paymentGateway`, `createdAt`; opcionalmente `partner` (quem indicou).
- **PreSaleClubSlot (pré-estreia):** `responsibleName`, `responsibleEmail`, `clubName`, `paymentStatus`, `paidAt`, `paymentProvider`.

Ou seja: já dá para saber **quem comprou** e **quem pagou**; falta só expor no admin.

---

## Opção 1 – Card clicável + página “Vendas aprovadas” (recomendada)

**No card:**
- Deixar o card **Receita do mês** como está (valor + % vs período anterior).
- Tornar o card **clicável** (ou botão “Ver vendas”) que leva para uma nova página **Admin → Vendas** (ex.: `/admin/vendas`).

**Nova página “Vendas” (ou “Vendas aprovadas”):**
- **Tabela** com todas as vendas aprovadas do mês (e filtro de período):
  - Data
  - Tipo (Plano/Assinatura | Jogo avulso | Pré-estreia)
  - **Quem comprou / Quem pagou:** nome e e-mail (User para Purchase; responsável/clube para Pré-estreia)
  - Valor (R$)
  - Gateway (Woovi, Stripe, etc.)
  - Status (sempre “Aprovado” nessa tela, ou ocultar)
- Filtros: período (mês atual, último mês, custom), tipo (plano / pré-estreia).
- Opcional: **exportar CSV** (para contabilidade/relatórios).

**Prós:** Um único lugar para “quem comprou, quem pagou e vendas aprovadas”; card continua simples.  
**Contras:** Exige criar uma nova rota e uma API de listagem de vendas.

---

## Opção 2 – Card com resumo + link

**No card:**
- Manter valor total e crescimento.
- Adicionar **subtitle** ou linha extra, por exemplo:
  - “X vendas este mês” (número de transações) e link “Ver detalhes”.
- Ou mini breakdown: “Planos: R$ X · Pré-estreia: R$ Y” (valores do mês).

**Destino do link:** mesma página **Vendas aprovadas** da Opção 1 (tabela com quem comprou, quem pagou, valor, data, tipo).

**Prós:** Card mais informativo sem poluir; link direto para o detalhe.  
**Contras:** Card um pouco mais carregado; a lista completa continua só na página de vendas.

---

## Opção 3 – Apenas expandir o card (sem nova página)

**No card:**
- Abaixo do valor, mostrar as **últimas 3–5 vendas** do mês (data, tipo, valor, e-mail ou nome de quem pagou).
- Botão “Ver todas” que leva para uma página de vendas (como na Opção 1).

**Prós:** Visão rápida sem sair do dashboard.  
**Contras:** Card fica grande; em mobile pode ficar apertado; lista completa continua precisando de uma página dedicada.

---

## Opção 4 – Duas páginas: “Vendas (planos)” e “Vendas (pré-estreia)”

- **Admin → Vendas (Planos):** só `Purchase` com `paymentStatus: paid`, com colunas: data, usuário (nome/e-mail), plano, valor, gateway.
- **Admin → Vendas (Pré-estreia):** só `PreSaleClubSlot` com `paymentStatus: PAID`, com colunas: data, responsável (nome/e-mail), clube, jogo, valor, gateway.

**Prós:** Separação clara por tipo de produto.  
**Contras:** Dois lugares para ver “vendas aprovadas”; receita total fica espalhada (ou você mantém o card com total + links para as duas).

---

## Recomendações

1. **Implementar a Opção 1** (card clicável ou “Ver vendas” + página **Vendas aprovadas** com tabela completa: quem comprou, quem pagou, valor, data, tipo, gateway). Assim você atende: “saber quem comprou, quem pagou” e “um lugar onde tem as vendas aprovadas”.
2. **Se quiser o card mais rico:** combinar com a **Opção 2** (no card: “X vendas no mês” ou breakdown Planos vs Pré-estreia + link “Ver vendas”).
3. **Evitar** depender só da Opção 3 (card com lista dentro) como único lugar de vendas; o ideal é ter sempre uma **página dedicada** com filtros e, se possível, exportação CSV.

Se disser qual opção (ou combinação) prefere, dá para desdobrar em tarefas técnicas (rotas, API, campos da tabela e texto do card).
