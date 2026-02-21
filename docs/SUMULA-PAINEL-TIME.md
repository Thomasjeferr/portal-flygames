# Súmula no painel da área do time

## O que já existe no projeto

### Modelo de dados
- **Game (jogo/partida)**  
  - `title`, `slug`, `championship`, `gameDate`, `description`  
  - `homeTeamId` / `awayTeamId` → relação com **Team** (mandante e visitante)  
  - `videoUrl`, `thumbnailUrl`, `categoryId`, `featured`, `order`  
  - **Não há:** placar, local da partida, árbitro, eventos (gols, cartões, substituições).

- **Team**  
  - Dados do time, elenco (**TeamMember**), jogos em que participa (`homeGames` e `awayGames`).

- **TeamMember**  
  - Elenco: nome, função (Presidente, Vice, Treinador, Tesoureiro, Atleta, Outros), número, posição, foto.

- **PlayEvent**  
  - Apenas registro de “usuário assistiu o jogo” (`userId`, `gameId`). Não é evento de súmula (gol, cartão etc.).

### Painel do time hoje
- **Comissões** – valores a receber (planos e patrocínio).
- **Elenco** – cadastro de membros (Presidente, Vice, Treinador, Tesoureiro, Atleta, Outros).
- **Dados do time** – informações gerais do clube.

Não existe hoje tela de “jogos” ou “súmula” no painel do time.

---

## O que falta para ter “súmula”

Uma súmula típica inclui:

1. **Dados da partida**  
   - Data/hora, local, competição, mandante x visitante (já temos em **Game**).  
   - **Placar:** gols do mandante e do visitante.  
   - **Local** (campo, endereço) e **arbitragem** (árbitro principal, opcionalmente assistentes).

2. **Eventos da partida**  
   - Gols (minuto, time, jogador).  
   - Cartões (amarelo/vermelho, jogador, minuto).  
   - Substituições (entrada/saída, minuto).  
   - Opcional: quem fez o gol / recebeu o cartão pode ser um **TeamMember** (vínculo com o elenco).

3. **Quem pode ver**  
   - No painel do time: só jogos em que o time participa (mandante ou visitante), com visualização em formato de súmula (dados + placar + eventos).

---

## Sugestões de implementação

### Fase 1 – Só visualização (sem novos eventos)
- **No banco:**  
  - Em **Game**, adicionar campos opcionais: `homeScore`, `awayScore`, `venue` (local), `referee` (árbitro).  
- **No painel do time:**  
  - Nova página **“Jogos”** ou **“Súmulas”** no menu do time.  
  - Listar jogos em que o time é mandante ou visitante (usar `homeTeamId` / `awayTeamId`).  
  - Ao clicar em um jogo, abrir uma tela de **súmula** com:  
    - Dados da partida (data, horário, competição, local, árbitro).  
    - Mandante x Visitante e **placar** (quando existir).  
  - Se `homeScore`/`awayScore` ainda não existirem, exibir só “– x –” ou “A confirmar”.

**Vantagem:** o time já consegue “visualizar” a súmula (dados + placar) sem cadastro de gols/cartões. O admin (ou integração futura) pode preencher placar/local/árbitro no cadastro do jogo.

### Fase 2 – Eventos da partida (gols, cartões, substituições)
- **No banco:**  
  - Novo modelo, por exemplo **GameEvent** (ou **SumulaEvent**):  
    - `gameId`, `type` (ex.: `goal`, `yellow_card`, `red_card`, `substitution`),  
    - `teamId` (qual time), `minute`, `description` (texto livre, ex. “Gol de João”).  
  - Opcional: `teamMemberId` para vincular o evento a um jogador do elenco (quem fez o gol / levou o cartão).  
- **No painel do time:**  
  - Na tela de súmula do jogo, exibir uma lista de eventos (gols, cartões, substituições) em ordem de minuto.  
- **Quem cadastra os eventos:**  
  - Opção A: apenas **admin** (telas no admin para editar o jogo e os eventos).  
  - Opção B: **painel do time** pode cadastrar/editar eventos dos jogos do próprio time (com permissão e validação por time).

### Fase 3 – Refino
- Filtros na lista de jogos (por competição, por data).  
- Exportar súmula em PDF.  
- Se no admin já existir tela de cadastro/edição de jogos, incluir aí os campos de placar, local, árbitro e, depois, a gestão de eventos.

---

## Resumo do que podemos fazer

| Item | O que é | Onde |
|------|--------|------|
| Campos no **Game** | `homeScore`, `awayScore`, `venue`, `referee` | Schema Prisma + migration |
| Menu no painel do time | Link “Súmulas” ou “Jogos” | Layout do time (`times/[id]/layout.tsx`) |
| API | Listar jogos do time (home ou away) | Nova rota ex.: `GET /api/team-portal/teams/[id]/games` |
| Página lista | Lista de jogos do time com data, adversário, placar | Nova página ex.: `painel-time/times/[id]/sumulas/page.tsx` |
| Página súmula | Detalhe: dados da partida + placar + (fase 2) eventos | Nova página ex.: `painel-time/times/[id]/sumulas/[gameId]/page.tsx` |
| Eventos (fase 2) | Modelo **GameEvent** + CRUD | Schema + API + telas admin e/ou painel |

Recomendação: começar pela **Fase 1** (campos no Game + listagem de jogos do time + tela de súmula só leitura). Depois evoluir para eventos (Fase 2) e refinamentos (Fase 3).
