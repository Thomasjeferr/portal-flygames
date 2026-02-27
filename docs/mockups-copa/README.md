# Mockups – Copa Mata-Mata (melhorias de UX)

Três modelos de interface para a área pública da Copa, pensados para reduzir confusão e permitir **entrar direto na tela de apoiar** quando fizer sentido.

## Como visualizar

Abra cada arquivo `.html` no navegador (duplo clique ou arrastar para o Chrome/Edge).

- **modelo-1-entrada-direta.html** – Uma tela só: ao clicar em "Copa", o torcedor já vê o conteúdo da copa (título + ranking + times confirmados), sem lista intermediária. Ideal quando há **um único torneio publicado** (ou um em destaque).
- **modelo-2-lista-enriquecida.html** – Mantém a lista de torneios, mas cada card mostra **mini-ranking** (top times + progresso) e CTAs claros: "Apoiar um time nesta copa" e "Ver ranking completo". Menos cliques e mais contexto.
- **modelo-3-dashboard-lado-a-lado.html** – Página da copa em **duas colunas**: à esquerda "Ranking de ativação" (com botão Apoiar em cada time), à direita "Times confirmados". Tudo visível de uma vez; fluxo mais direto.

## Resumo das ideias

| Modelo | Ideia principal | Quando usar |
|--------|-----------------|-------------|
| 1 – Entrada direta | /torneios vira a própria página do torneio quando há 1 (ou destaque) | Poucos torneios; foco em uma copa por vez |
| 2 – Lista enriquecida | Cards com preview do ranking e CTA "Apoiar" já no card | Vários torneios; usuário escolhe pela lista mas entende o que vai encontrar |
| 3 – Dashboard | Ranking e confirmados lado a lado na mesma tela | Deixar claro o que é “em meta” e o que já está confirmado |

## Implementação no projeto

Para aplicar um dos modelos no Next.js:

- **Modelo 1:** Em `/torneios`, se `tournaments.length === 1`, fazer redirect para `/torneios/[slug]` ou renderizar o conteúdo do torneio direto na mesma rota.
- **Modelo 2:** Ajustar a página `/torneios` para buscar, por torneio, os times em meta (e talvez confirmados) e exibir no card; botão "Apoiar" pode ir para `/torneios/[slug]/apoiar` ou abrir o ranking.
- **Modelo 3:** Ajustar a página `/torneios/[slug]` para layout em grid de 2 colunas (ranking | confirmados) em telas maiores, mantendo a mesma informação que já existe.
