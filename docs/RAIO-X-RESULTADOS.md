# Raio-X: Páginas de Resultados (/resultados)

Análise das telas onde o torcedor vê resultados e súmulas. **Nenhuma alteração foi feita no código** — apenas diagnóstico e sugestões de melhoria.

---

## 1. Estrutura atual

| Rota | Conteúdo |
|------|----------|
| `/resultados` | Lista de jogos com súmula aprovada (ambos os times). Se não logado: CTA para cadastro/entrar. |
| `/resultados/[slug]` | Detalhe do jogo: título, data, campeonato, placar, local, árbitro, tabelas de estatísticas (súmula) por time. |

- **Header**: link "Resultados" existe (desktop e mobile).
- **Layout**: usa o layout global (Header + main + Footer), fundo `bg-futvar-darker`, padding e max-width consistentes.

---

## 2. O que está completo e funcional

- Lista só mostra jogos com **duas aprovações** e `sumulaPublishedAt` preenchido.
- Detalhe exige jogo existente, súmula publicada e ambas aprovações (404 se não).
- **Logado** → vê lista e detalhe sem checagem de assinatura/patrocínio.
- **Não logado** → vê CTA “Cadastre-se grátis” com botões para cadastro e entrar e `redirect` correto.
- Dados exibidos: escudos, nomes, placar, campeonato, data/hora, local, árbitro, tabela de jogadores (G, A, amarelo, vermelho, destaque) por time.
- Links de navegação: “Voltar ao início”, “Voltar aos resultados”.
- Metadata (title/description) definida.
- Cores e tipografia alinhadas ao restante do site (futvar-green, futvar-dark, futvar-light).
- Cards da lista com hover (`hover:bg-white/5`), bordas e espaçamento ok.
- Tabelas da súmula com cabeçalho e linhas separadas, overflow horizontal em mobile.

---

## 3. Pontos de atenção (completude / consistência)

- **Estado vazio da lista**: mensagem clara (“Nenhum resultado aprovado…”), mas poderia sugerir “Ver jogos” ou “Próximos jogos” para não deixar a página “morta”.
- **Jogo sem placar**: na lista aparece “x” entre os times; no detalhe também. Está correto, mas pode ser reforçado com “Placar a confirmar” ou similar se fizer sentido no negócio.
- **Imagens dos escudos**: sem `alt` descritivo (hoje `alt=""`). Para acessibilidade, `alt` com nome do time melhora leitura por tela.
- **Data no detalhe**: `weekday: 'long'` pode vir em inglês dependendo do ambiente; vale garantir locale `pt-BR` em todos os `toLocaleDateString` (já usado, mas conferir em todos os lugares).
- **Tabelas da súmula**: cabeçalhos “Amarelo” e “Vermelho” estão claros; “G” e “A” são padrão de torcedor; “Destaque” também. Pode ajudar uma legenda curta na primeira vez (ex.: “G = Gols, A = Assistências”) se o público for muito variado.

---

## 4. Experiência e visual (agradável para o torcedor?)

**Pontos positivos**

- Hierarquia clara: título da página → texto de apoio → lista ou card do jogo.
- Placar em destaque (verde, negrito) no card e no detalhe — fácil de escanear.
- Escudos dão identidade visual aos times.
- Fundo escuro e verde seguem identidade “Futvar”; leitura confortável.
- CTA para não logado é direto e convida a criar conta sem bloquear.

**O que pode melhorar a experiência**

1. **Lista**
   - **Ordenação**: hoje é só por `gameDate` desc. Pode ser útil filtro ou abas “Mais recentes” / “Por campeonato” (quando houver muitos jogos).
   - **Destaque do placar**: no card, o placar pode ser um pouco maior ou com fundo discreto para puxar o olho.
   - **Indicação de “súmula disponível”**: um pequeno badge ou ícone “Súmula”/“Estatísticas” no card ajuda quem procura isso especificamente.
   - **Paginação ou “Carregar mais”**: quando a lista crescer, evitar página única muito longa.

2. **Detalhe do jogo**
   - **Título da página (SEO e aba)**: usar o título do jogo (ex.: “Time A x Time B – Campeonato”) no `<title>` e no `<h1>` já está bom; pode-se enriquecer a meta description com placar e data.
   - **Seção de estatísticas**: separar visualmente mandante e visitante (cards ou fundos levemente diferentes) pode facilitar a leitura.
   - **Local e árbitro**: podem ficar numa linha única (ícone + texto) para ganhar espaço e parecer mais “ficha do jogo”.
   - **Link para o vídeo**: se no futuro quem tiver acesso ao jogo puder assistir, um botão “Assistir jogo” (visível só para quem tem permissão) no topo do detalhe seria natural.

3. **Geral**
   - **Breadcrumb**: “Início > Resultados” ou “Início > Resultados > [Jogo]” no topo ajuda navegação e SEO.
   - **Compartilhar**: botão “Compartilhar resultado” (link ou Web Share API) aumenta divulgação.
   - **Mobile**: padding e tabelas com scroll já ajudam; garantir que os botões do CTA tenham área de toque confortável (já parecem ok).

---

## 5. Acessibilidade

- Contraste texto (branco/cinza claro) em fundo escuro está adequado.
- Links com texto claro (“Voltar ao início”, “Criar conta grátis”).
- Cabeçalhos em ordem (h1 na página, h3 na seção de estatísticas).
- **Melhorar**: `alt` nos escudos; garantir que as tabelas tenham `<th scope="col">` onde fizer sentido; evitar usar só ícones/cores para informação (ex.: cartões já têm texto “Amarelo”/“Vermelho”).

---

## 6. Resumo: está completo e agradável?

- **Completo**: sim — lista, detalhe, CTA para não logado, dados da súmula e regras de exibição (aprovado + publicado) estão cobertos.
- **Agradável**: está bom para uso atual; com as melhorias sugeridas (destaque do placar, pequenos badges, organização do detalhe, breadcrumb, compartilhar), a experiência fica mais polida e “de produto” para o torcedor.

---

## 7. Possibilidades de melhoria (checklist)

- [ ] **Lista**: badge/indicador “Súmula” ou “Estatísticas” no card do jogo.
- [ ] **Lista**: placar um pouco maior ou com fundo discreto no card.
- [ ] **Lista**: paginação ou “Carregar mais” quando houver muitos jogos.
- [ ] **Lista**: filtro por campeonato ou ordenação (ex.: mais recentes primeiro já está).
- [ ] **Detalhe**: local e árbitro em uma linha com ícones (pin + apito).
- [ ] **Detalhe**: separar visualmente as tabelas de mandante e visitante (cards/background).
- [ ] **Detalhe**: botão “Assistir jogo” (quando aplicável) para quem tem acesso ao vídeo.
- [ ] **Geral**: breadcrumb (Início > Resultados [> Jogo]).
- [ ] **Geral**: botão “Compartilhar” no detalhe do jogo.
- [ ] **Geral**: `alt` nos escudos com nome do time.
- [ ] **Geral**: estado vazio da lista com link para “Ver jogos” ou “Próximos jogos”.
- [ ] **SEO**: meta description do detalhe com placar e data (ex.: “Time A 2 x 1 Time B – 26/02/2026”).

Nenhuma alteração foi feita no código; use este documento para priorizar as melhorias que quiser implementar.
