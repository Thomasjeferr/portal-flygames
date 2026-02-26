# Análise: páginas do admin que se beneficiam de paginação

**Status:** Paginação implementada nas listas de prioridade alta e nos itens solicitados (Planos, Planos de patrocínio, Categorias).

- **Usuários** – paginado (10 por página).
- **Parceiros** – API + UI paginados.
- **Times** – API + UI paginados (busca e filtro ativo mantidos).
- **Jogos** – API + UI paginados (filtro por categoria + paginação).
- **Saques** – APIs de parceiro e time paginadas; página com duas seções, cada uma com Anterior/Próxima.
- **Pedidos de patrocínio** – API + UI paginados.
- **Planos** – API + UI paginados.
- **Planos de patrocínio** – API + UI paginados.
- **Categorias** – API + UI paginados.

Abaixo, a avaliação por prioridade (referência).

---

## Prioridade alta (recomendado implementar)

Listas que podem crescer bastante e hoje carregam tudo de uma vez.

| Página | Rota admin | API | Motivo |
|--------|------------|-----|--------|
| **Parceiros** | `/admin/partners` | `GET /api/admin/partners` | Número de parceiros pode crescer; lista em tabela com status, ações, etc. |
| **Times** | `/admin/times` | `GET /api/admin/teams` | Muitos times; já tem busca (`q`) e filtro ativo/inativo — paginação combina bem. |
| **Jogos** | `/admin/jogos` | `GET /api/admin/games` | Catálogo de jogos tende a crescer; hoje traz todos e filtra por categoria no front. |
| **Saques** | `/admin/saques` | `GET /api/admin/partner-withdrawals` e `team-withdrawals` | Duas listas (parceiro + time); ambas podem ficar grandes. |
| **Pedidos de patrocínio** | `/admin/sponsor-orders` (e equivalente) | `GET /api/admin/sponsor-orders` | Lista de pedidos pagos (e “sem time”); pode crescer com o tempo. |

---

## Prioridade média (útil se a lista crescer)

Listas que em muitos casos continuam pequenas, mas podem virar problema se o uso aumentar.

| Página | Rota admin | API | Motivo |
|--------|------------|-----|--------|
| **Solicitações de time** | `/admin/team-requests` | `GET /api/admin/team-requests` | Lista de “não encontrou o time”; volume depende do tráfego. |
| **Lives** | `/admin/lives` | `GET /api/admin/lives` | Lista de transmissões; paginação ajuda se houver muitas lives antigas. |
| **Pré-estreia (jogos)** | `/admin/pre-estreia` | API de pre-sale-games | Lista de jogos em pré-estreia; paginar se o número de itens crescer. |

---

## Prioridade baixa (geralmente não precisa)

Listas tipicamente pequenas ou com poucos itens.

| Página | Motivo |
|--------|--------|
| **Planos** | Poucos planos (assinatura, avulsos, etc.). |
| **Planos de patrocínio** | Poucos sponsor plans. |
| **Categorias** | Poucas categorias. |
| **Banner** | Poucos banners. |
| **Categorias pré-estreia / meta** | Listas curtas. |
| **Templates de e-mail** | Poucos templates. |

---

## Ordem sugerida de implementação

1. **Parceiros** – impacto alto; padrão igual ao de Usuários (tabela, filtros futuros).
2. **Times** – já tem busca e filtro; só falta paginação na API e na UI.
3. **Jogos** – lista que mais tende a crescer no catálogo.
4. **Saques** – duas APIs (parceiro e time); paginação em ambas e duas áreas na tela ou abas.
5. **Pedidos de patrocínio** – uma lista; paginação simples.
6. **Team requests** e **Lives** – quando o volume justificar.

---

## Padrão a reutilizar (Usuários)

- **API:** parâmetros `page` (1-based) e `limit` (ex.: 10); resposta `{ items, total, page, limit, totalPages }`.
- **Front:** estado `page`, `total`, `totalPages`; botões Anterior/Próxima; texto “X–Y de Z itens” e “Página N de M”.
- Ao mudar filtro/busca, resetar `page` para 1.

Com isso, você sabe em quais páginas vale a pena inserir paginação e em que ordem.
