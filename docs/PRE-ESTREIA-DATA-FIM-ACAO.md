# Data do final da ação — Pré-estreia Clubes e Meta

Análise de como adicionar uma **data (e opcionalmente hora) de encerramento** da ação, tanto para Pré-estreia Clubes quanto para Pré-estreia Meta.

---

## 1. O que seria “final da ação”

| Fluxo | Significado sugerido |
|-------|----------------------|
| **Clubes** | Prazo limite para os clubes **financiarem os slots** (comprar slot A/B). Após essa data, não se aceita mais pagamento de novo slot; quem já pagou continua com acesso quando o jogo for publicado. |
| **Meta** | Prazo limite para as torcidas **contarem na corrida da meta** (novos assinantes). Após essa data, a “corrida” encerra: ou as duas torcidas bateram a meta (jogo pode ser publicado) ou não (jogo pode ser encerrado/cancelado ou seguir outra regra). |

Em ambos os casos é um **prazo único por jogo**: “até quando essa pré-estreia aceita a ação”.

---

## 2. Opção de modelo (recomendada): um campo só

- **Campo:** `actionEndsAt` (ou `endsAt`) — `DateTime?` (opcional).
- **Uso:** mesmo campo para Clubes e Meta; o significado muda pelo `metaEnabled`:
  - **Clubes:** “até quando clubes podem comprar slots”.
  - **Meta:** “até quando a meta de assinantes é considerada”.

**Vantagens:** uma migração, uma coluna, formulários e listagens simples. Semântica clara: “data/hora em que a ação dessa pré-estreia termina”.

**Alternativa:** dois campos (`clubFundingEndsAt` e `metaRaceEndsAt`) só se no futuro as regras forem diferentes (ex.: uma data para parar de vender e outra para encerrar a corrida). Para “data do final da ação” genérica, um campo basta.

---

## 3. Onde usar a data

### 3.1 Banco e API

- **Schema (Prisma):** adicionar em `PreSaleGame`:
  - `actionEndsAt DateTime? @map("action_ends_at")`
- **Migração:** `ALTER TABLE "PreSaleGame" ADD COLUMN "action_ends_at" TIMESTAMP;`
- **Validações:** ao criar/editar, se informado: `actionEndsAt` deve ser data/hora futura (ou pelo menos não no passado, conforme regra de negócio).
- **APIs:** incluir `actionEndsAt` no GET do jogo e, onde fizer sentido, no payload de create/update.

### 3.2 Formulários admin

- **Pré-estreia Clubes (novo + editar):** campo opcional “Data/hora do fim do financiamento” (ou “Prazo para clubes comprarem os slots”).
- **Pré-estreia Meta (novo + editar):** campo opcional “Data/hora do fim da meta” (ou “Prazo para atingir a meta de assinantes”).
- Pode ser um único `<input type="datetime-local">` ou dois campos (data + hora), sempre salvos em UTC no banco e exibidos em fuso do usuário se quiser.

### 3.3 Listagens admin

- **Lista Clubes e Lista Meta:** na linha do jogo, exibir por exemplo “Encerra em DD/MM/AAAA HH:mm” ou “Encerrado em …” se `actionEndsAt` já passou.
- **Dashboard:** na tabela de pré-estreias, mesma ideia (coluna “Encerra em” ou “Status do prazo”).

### 3.4 Regras de negócio (onde a data “vala”)

- **Checkout Clubes** (`/api/pre-sale/checkout` ou equivalente): antes de gerar pagamento, checar `game.actionEndsAt`. Se existir e `new Date() > game.actionEndsAt`, retornar erro do tipo “Prazo para financiamento encerrado”.
- **Home / listagem pública Clubes:** ao montar a lista de pré-estreias “em andamento”, filtrar ou sinalizar jogos com `actionEndsAt` no passado (ex.: não mostrar ou mostrar como “Encerrado”).
- **Home / bloco Meta:** idem: não contar ou não exibir como “ativo” se `actionEndsAt` já passou; barras de progresso podem mostrar “Corrida encerrada” quando aplicável.
- **Publicação:** a data do fim da ação não precisa mudar o status sozinha; pode só ser usada nas validações acima. Se quiser, depois dá para ter um job/cron que, após `actionEndsAt`, altera status ou notifica (ex.: marcar como “encerrado” ou “cancelado”).

---

## 4. Resumo de passos para implementar

1. **Migração:** adicionar `actionEndsAt DateTime?` em `PreSaleGame` e rodar `prisma migrate`.
2. **Validações:** no schema de create/update de pré-estreia, aceitar `actionEndsAt` opcional e, se preenchido, validar (ex.: não no passado).
3. **API:** create/update e GET do jogo incluir e retornar `actionEndsAt`.
4. **Formulários:** novo/editar Clubes e novo/editar Meta com campo opcional de data/hora; enviar no submit em formato que o backend aceite (ex.: ISO ou timestamp).
5. **Listagens admin:** exibir “Encerra em” / “Encerrado em” usando `actionEndsAt`.
6. **Checkout Clubes:** bloquear novo pagamento de slot se `actionEndsAt` já passou.
7. **Home (Clubes e Meta):** não listar como “ativo” ou exibir como “encerrado” quando `actionEndsAt` no passado (conforme regra desejada).

---

## 5. Dicas extras

- **Fuso horário:** guardar no banco em UTC; no front, converter para o fuso do usuário (ex.: `Intl` ou lib de datas) para exibir “Encerra em DD/MM às HH:mm”.
- **Opcional:** começar com a data opcional (null = sem prazo); depois, se quiser, tornar obrigatória para novos jogos.
- **Texto na UI:** “Data do fim da ação” ou “Prazo limite” deixam claro que, depois dessa data, a ação (financiar ou corrida da meta) encerra.

Se quiser, no próximo passo dá para desenhar o diff exato do schema e dos formulários (campos e nomes) para você implementar no código.
