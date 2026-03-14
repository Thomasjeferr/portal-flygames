# Plano: E-mails automáticos para usuário ativo (live e jogo publicado)

Objetivo: criar **novos modelos de e-mail** enviados automaticamente para **usuários ativos** (assinantes) quando ocorrem eventos de **live** (programada, iniciada, cancelada) e quando um **jogo é publicado**.

---

## 1. O que já existe no projeto

### Templates de e-mail (EmailTemplate)
- **WELCOME**, **VERIFY_EMAIL**, **RESET_PASSWORD**, **PASSWORD_CHANGED**
- **PURCHASE_CONFIRMATION**, **SPONSOR_CONFIRMATION**, **LIVE_PURCHASE_CONFIRMATION**
- **PRE_SALE_CREDENTIALS**, **PRE_SALE_CREDENTIALS_NEW_PASSWORD**
- **SUMULA_*** (vários), **TOURNAMENT_INSCRICAO_REGULAMENTO**

Todos usam `sendTransactionalEmail(to, templateKey, vars)` e estão na tabela `EmailTemplate` (editáveis em Admin > E-mails > Templates). O seed está em `prisma/seed-emails.ts`.

### Lives
- **Criar/programar:** `POST /api/admin/lives` (admin) → `prisma.live.create` com status `SCHEDULED`, `startAt`, `endAt`, título, times etc.
- **Iniciar:** status passa de `SCHEDULED` para `LIVE` em dois casos:
  1. Admin altera manualmente: `PATCH /api/admin/lives/[id]` com `status: 'LIVE'`
  2. Automático: na página `/live/[id]`, quando `startAt` já passou, o servidor faz `update` para `LIVE`
- **Cancelar:** hoje não existe status “cancelado”. Possibilidades:
  - **DELETE** da live: `DELETE /api/admin/lives/[id]` (remove a live)
  - Ou admin altera para **ENDED** antes de começar (cancelamento lógico)
- Modelo **Live**: `status` = `SCHEDULED` | `LIVE` | `ENDED`; `title`, `startAt`, `endAt`, `homeTeamId`, `awayTeamId`, etc.

### Jogos (Game)
- **Publicado** = jogo com **videoUrl** preenchido (e exibido no site). Pode ser:
  - Criação com vídeo: `POST /api/admin/games` com `videoUrl`
  - Edição: `PATCH /api/admin/games/[id]` quando `videoUrl` passa de vazio para preenchido (ou é alterado)

### Quem é “usuário ativo”
- **Assinantes com acesso:** usuários que têm **Subscription** ativa (`active: true` e `endDate >= now`).  
- Podemos incluir também quem tem **patrocínio empresa** ativo (acesso ao conteúdo), se desejado.  
- Definição proposta: **enviar apenas para usuários com assinatura ativa** (plano recorrente). Quem só comprou jogo avulso pode ser incluído ou não; podemos deixar só assinatura para simplificar.

---

## 2. Novos e-mails propostos

| # | Evento | Momento do envio | Destinatários | Template sugerido |
|---|--------|-------------------|---------------|-------------------|
| 1 | **Live programada** | Logo após criar a live (`POST /api/admin/lives` → `prisma.live.create`) | Todos os usuários com assinatura ativa | `LIVE_SCHEDULED` |
| 2 | **Live iniciada** | Quando a live passar a status `LIVE` (no `PATCH` do admin ou na lógica da página `/live/[id]`) | Mesmos (assinantes ativos) | `LIVE_STARTED` |
| 3 | **Live cancelada** | Quando a live for **deletada** (`DELETE /api/admin/lives/[id]`) ou quando o admin alterar para **ENDED** com `startAt` ainda no futuro | Mesmos | `LIVE_CANCELLED` |
| 4 | **Jogo publicado** | Quando um jogo passar a ter **videoUrl** preenchido (em `POST` ou `PATCH` de jogos) — apenas na **primeira** vez que fica “publicado” (antes não tinha vídeo) | Mesmos | `GAME_PUBLISHED` |

---

## 3. Detalhes técnicos

### 3.1 Lista de destinatários (assinantes ativos)
- Query: `User` com `Subscription` onde `active = true` e `endDate >= now`.
- Obter lista de e-mails (e opcionalmente nome) para enviar.  
- Evitar enviar o mesmo e-mail duas vezes se o usuário tiver mais de uma subscription (agrupar por `userId`).

### 3.2 Novos templates (EmailTemplateKey + seed)
- **LIVE_SCHEDULED**  
  - Variáveis sugeridas: `name`, `live_title`, `live_start_at`, `live_url`, `app_base_url`.  
  - Assunto tipo: “Nova live programada: {{live_title}} – Fly Games”.

- **LIVE_STARTED**  
  - Variáveis: `name`, `live_title`, `live_url`, `app_base_url`.  
  - Assunto: “Ao vivo agora: {{live_title}} – Fly Games”.

- **LIVE_CANCELLED**  
  - Variáveis: `name`, `live_title`, `live_start_at` (opcional).  
  - Assunto: “Live cancelada: {{live_title}} – Fly Games”.

- **GAME_PUBLISHED**  
  - Variáveis: `name`, `game_title`, `game_championship`, `game_url`, `app_base_url`.  
  - Assunto: “Novo jogo disponível: {{game_title}} – Fly Games”.

### 3.3 Onde disparar no código (sem alterar contrato das APIs)
- **LIVE_SCHEDULED:** em `src/app/api/admin/lives/route.ts`, após `prisma.live.create`, buscar assinantes ativos e enviar um e-mail por destinatário com `sendTransactionalEmail` (template `LIVE_SCHEDULED`). Não bloquear a resposta; usar `.catch()` ou envio em background.
- **LIVE_STARTED:**  
  - No `PATCH` de `src/app/api/admin/lives/[id]/route.ts`: quando `data.status === 'LIVE'` e a live antes era `SCHEDULED`, disparar envio.  
  - Na página `src/app/live/[id]/page.tsx`: quando o servidor fizer o `update` de `SCHEDULED` → `LIVE`, disparar envio **uma vez** (ex.: verificar se já existe log/envio para essa live + template LIVE_STARTED, ou um campo `notifiedStartedAt` na Live; o mais simples é um flag na tabela Live ou um log em EmailLog com metadata).  
  - Importante: enviar **apenas uma vez** por live (evitar duplicata quando vários usuários acessam a página).
- **LIVE_CANCELLED:**  
  - No `DELETE` de `src/app/api/admin/lives/[id]/route.ts`: antes de `prisma.live.delete`, ler a live (título, startAt), buscar assinantes ativos e enviar `LIVE_CANCELLED`.  
  - Opcional: no `PATCH` de lives, quando status for alterado para `ENDED` e `existing.startAt > now`, tratar como cancelamento e enviar o mesmo e-mail.
- **GAME_PUBLISHED:**  
  - Em `PATCH /api/admin/games/[id]`: quando `data.videoUrl` for passado e estiver preenchido **e** `existing.videoUrl` era vazio/nulo → considerar “jogo acabou de ser publicado” e disparar e-mail.  
  - Em `POST /api/admin/games`: quando `data.videoUrl` vier preenchido → disparar (jogo já criado publicado).  
  - Enviar só quando o jogo **passa** a ter vídeo (não reenviar ao editar outro campo de um jogo que já tinha vídeo).

### 3.4 Volume e performance
- Envio para N assinantes: N chamadas a `sendTransactionalEmail` (uma por e-mail). Fazer em loop com `await` pode demorar; pode usar `Promise.all` em lotes (ex.: 10 em 10) para não sobrecarregar o Resend e não travar a request. Ou disparar um job em background (se no futuro tiver fila). Por ora: enviar em sequência ou em pequenos lotes sem bloquear a resposta da API (fire-and-forget após salvar no banco).

---

## 4. Resumo para você dar o OK

1. **Quatro novos templates:**  
   `LIVE_SCHEDULED`, `LIVE_STARTED`, `LIVE_CANCELLED`, `GAME_PUBLISHED`  
   com variáveis e assuntos como acima (editáveis depois no Admin).

2. **Destinatários:** apenas usuários com **assinatura ativa** (Subscription ativa e endDate >= hoje). Confirmar se entram também patrocínio empresa e/ou compradores de jogo avulso ou só assinatura.

3. **Live “iniciada”:** enviar quando status passar para `LIVE` (tanto no PATCH do admin quanto no update automático da página), garantindo **uma única** notificação por live (ex.: flag na Live ou checagem em EmailLog).

4. **Live “cancelada”:** enviar quando a live for **deletada** (DELETE). Opcional: também quando o admin mudar para ENDED com startAt no futuro.

5. **Jogo publicado:** enviar apenas quando o jogo **passar a ter** `videoUrl` (criação com vídeo ou edição de “sem vídeo” para “com vídeo”), uma vez por jogo.

6. **Falha no envio:** não falhar a ação do admin (criar/editar live/jogo, deletar live). Envio em background com `.catch()` e log de erro.

7. **Seed e Admin:** adicionar os 4 templates no `EmailTemplateKey` em `emailService.ts`, criar os registros no `seed-emails.ts` (ou migration/seed separado) e, se necessário, incluir as chaves na listagem de templates no Admin (já deve listar por `key` da tabela).

Assim que você aprovar (e ajustar qualquer ponto, ex.: quem recebe, cancelamento só DELETE ou também ENDED), dá para implementar na ordem: templates + seed → função “buscar assinantes ativos” + “enviar para N” → disparos em cada fluxo (lives e jogo).
