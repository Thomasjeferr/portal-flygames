# Raio-X: Elenco / Jogadores — Área do Time e Admin

Resumo do que existe hoje para **inserir, editar e excluir jogadores (membros do elenco)** na área do time e o que o admin tem relacionado.

---

## Modelo (Prisma)

**TeamMember** (tabela `team_members`):

| Campo       | Tipo     | Uso |
|------------|----------|-----|
| id         | String   | cuid |
| teamId     | String   | time ao qual pertence |
| name       | String   | Nome |
| role       | String   | Função (ex.: PRESIDENTE, TREINADOR, ATLETA, PLAYER, COACH, etc.) |
| number     | Int?     | Número da camisa |
| position   | String?  | Posição (ex.: Atacante, Zagueiro) |
| photoUrl   | String?  | URL da foto (upload no painel) |
| isActive   | Boolean  | Ativo no elenco |
| createdAt  | DateTime | |
| updatedAt  | DateTime | |

Relações: `Team` tem `members TeamMember[]`; `PlayerMatchStats` referencia `teamMemberId` (estatísticas da súmula por jogador).

---

## Área do Time (painel) — Inserir, editar e excluir

### Página

- **Rota:** `/painel-time/times/[id]/elenco`
- **Arquivo:** `src/app/painel-time/times/[id]/elenco/page.tsx`
- **Menu:** no layout do time há link "Elenco" (`/painel-time/times/[id]/elenco`).

### O que o time pode fazer

| Ação | Como |
|------|------|
| **Listar** | GET `/api/team-portal/teams/[id]/members` — retorna todos os membros do time (ordenados por isActive desc, name asc). |
| **Inserir** | Formulário na página → POST `/api/team-portal/teams/[id]/members` com body: `name`, `role`, `number`, `position`, `photoUrl`, `isActive`. Nome obrigatório. |
| **Editar** | Botão "Editar" na linha → preenche o formulário → enviar com PATCH `/api/team-portal/teams/[id]/members` com body: `id` + mesmos campos. |
| **Excluir** | Botão "Remover" → confirmação `confirm(...)` → DELETE `/api/team-portal/teams/[id]/members` com body: `{ id }`. |

### Campos no formulário (painel)

- **Nome** * (obrigatório)
- **Função**: select com PRESIDENTE, VICE_PRESIDENTE, TREINADOR, TESOUREIRO, ATLETA, OUTROS (a API aceita qualquer string; legado PLAYER, GOALKEEPER, COACH, STAFF são exibidos com labels na lista)
- **Número**: opcional
- **Posição**: texto livre (ex.: Atacante, Zagueiro)
- **Foto**: opcional — upload via "Carregar foto" → POST `/api/upload/member-photo` (FormData: `teamId`, `file`). Retorna `url`; o formulário envia essa URL em `photoUrl` no POST/PATCH de members.
- **Ativo no elenco**: checkbox (isActive)

### API de membros (team-portal)

| Método | Rota | Body (resumo) | Resposta |
|--------|------|----------------|----------|
| GET    | `/api/team-portal/teams/[id]/members` | — | Array de TeamMember (todos os campos) |
| POST   | `/api/team-portal/teams/[id]/members` | name, role?, number?, position?, photoUrl?, isActive? | 201 + membro criado |
| PATCH  | `/api/team-portal/teams/[id]/members` | id + name?, role?, number?, position?, photoUrl?, isActive? | 200 + membro atualizado |
| DELETE | `/api/team-portal/teams/[id]/members` | { id } | 200 { ok: true } |

Todas as rotas exigem **acesso ao time** (`getTeamAccess(teamId)`). DELETE remove o registro (deleteMany where id + teamId).

### Upload de foto (painel)

- **Rota:** POST `/api/upload/member-photo`
- **Body:** FormData com `teamId` e `file` (imagem).
- **Regras:** acesso ao time obrigatório; máx. 2MB; jpg, png ou webp (validado por extensão e magic bytes). Salva em Vercel Blob (se `BLOB_READ_WRITE_TOKEN`) ou em `public/uploads/`.
- **Retorno:** `{ url }` para usar em `photoUrl` do membro.

---

## Admin — O que existe relacionado a elenco

### Onde o admin vê o elenco

- **Página:** `/admin/times/[id]/editar` (editar time).
- **Bloco:** seção **"Elenco do time"** no final da página: tabela somente leitura com Nome, Função, Nº, Posição, Ativo.
- **Fonte dos dados:** GET `/api/admin/teams/[id]` retorna o time com `members` (id, name, role, number, position, isActive, createdAt). Não há `photoUrl` no select do GET do admin.

### O que o admin **não** pode fazer

- O admin **não** insere, edita nem exclui membros do elenco. Não há formulário nem botões para isso na tela de edição do time.
- Texto na página: *"Jogadores e comissão cadastrados pelo time no painel. Atualize a página para ver alterações."*

### Exibição de “Função” no admin

- A tabela do admin usa labels para roles antigos: PLAYER → "Jogador", GOALKEEPER → "Goleiro", COACH → "Treinador", STAFF → "Staff". Para qualquer outro valor (ex.: PRESIDENTE, ATLETA) exibe o próprio `role` como texto.

---

## Resumo rápido

| Onde | Inserir | Editar | Excluir | Ver |
|------|---------|--------|---------|-----|
| **Área do time** (`/painel-time/times/[id]/elenco`) | Sim (POST members) | Sim (PATCH members) | Sim (DELETE members) | Sim (GET members + tabela + foto) |
| **Admin** (`/admin/times/[id]/editar`) | Não | Não | Não | Sim (tabela somente leitura, sem foto) |

---

## Pontos de atenção para deploy

1. **Súmula:** o admin ao preencher súmula usa os **members ativos** do time (homeTeam / awayTeam). Se o time não tiver elenco cadastrado no painel, a lista de jogadores na súmula fica vazia até o time cadastrar.
2. **PlayerMatchStats:** ao excluir um membro no painel (DELETE members), o Prisma exclui em cascata os **PlayerMatchStats** vinculados a esse `teamMemberId` (relação `TeamMember` → `PlayerMatchStats` com `onDelete: Cascade`). Ou seja, as estatísticas daquele jogador em súmulas passam a sumir; o jogo e o placar continuam, só as linhas de stats daquele membro são removidas.
3. **Roles:** o painel usa PRESIDENTE, TREINADOR, ATLETA, etc.; a API de members aceita qualquer string. Membros antigos podem ter PLAYER, COACH, etc. Ambas as UIs tratam os dois conjuntos de labels.
4. **Foto no admin:** se quiser mostrar foto no admin, é preciso incluir `photoUrl` no `select` de `members` em GET `/api/admin/teams/[id]` e exibir na tabela.
