# Replay de Jogos Ao Vivo: Home e “Todos os Jogos”

Análise do que existe e proposta de implementação (sem implementar). Objetivo: ter uma seção clara **“Replay de Jogos Ao Vivo”** na home, o último jogo ao vivo aparecer assim que a live acaba (ou assim que o replay fica disponível), e os replays também aparecerem em **“Todos os jogos”** (`/jogos`).

---

## 1. O que temos hoje

### Home

- Existe a seção **“Últimos jogos ao vivo”** (id `ultimos-jogos`) com badge **“Replays”**.
- Ela usa `getLiveReplays()`: busca no banco **Live** com `cloudflarePlaybackId` não nulo (até 8), ordenadas por `endAt` desc.
- Ou seja: só entra na lista **quando o replay já existe** (admin já preencheu o playback ID do Cloudflare). Se a live acabou mas o replay ainda não foi vinculado, o jogo **não** aparece nessa seção.
- Cada card leva para `/live/[id]` (mesma página que ao vivo; com replay mostra o player de replay).

### Página “Todos os jogos” (`/jogos`)

- Lista apenas o modelo **Game** (jogos gravados / VOD), com filtros por time, campeonato, ano, categoria.
- **Não** inclui nenhuma live nem replay de live. Replays de transmissão ao vivo hoje **só** aparecem na home na seção “Últimos jogos ao vivo”.

### Quando a live “acaba”

- No banco: `status` vira `ENDED` quando `endAt` passa (ou o admin muda).
- O replay só fica disponível quando o admin preenche **`cloudflarePlaybackId`** na live (vídeo gravado no Cloudflare). Até lá, em `/live/[id]` o usuário vê “O jogo acabou” e os links para a home.
- Hoje não há “último jogo ao vivo” mostrado na home **antes** de ter replay; a seção só mostra itens que já têm `cloudflarePlaybackId`.

---

## 2. O que se quer (resumo)

1. **Home:** seção com nome claro tipo **“Replay de Jogos Ao Vivo”**, e que o **último jogo ao vivo** apareça na página assim que a live acaba (idealmente assim que o replay fica disponível; opcionalmente mostrar “replay em breve” quando acabou mas ainda sem playback).
2. **Todos os jogos:** replays de lives **também** disponíveis em `/jogos` (junto com os jogos gravados ou em área/filtro dedicada).

---

## 3. Proposta de implementação (sem implementar)

### 3.1 Home – “Replay de Jogos Ao Vivo”

**Nome e posição**

- Renomear ou deixar explícito na home o título da seção para algo como **“Replay de Jogos Ao Vivo”** (em vez de só “Últimos jogos ao vivo”), mantendo o badge “Replays” ou “Ao vivo” se fizer sentido.
- Manter a seção onde está (após pré-venda / outras faixas) ou subir um pouco para dar mais destaque ao “último ao vivo”.

**“Assim que acaba a live, aparecer o último jogo”**

- **Opção A (replay já disponível):**  
  Manter a regra atual: só mostrar na seção quando `cloudflarePlaybackId` estiver preenchido. O “assim que acaba” na prática vira “assim que o admin disponibiliza o replay” (colando o playback ID). Nenhuma mudança de lógica; só garantir que a query continua ordenada por `endAt` desc para o mais recente aparecer primeiro (já está).
- **Opção B (aparecer assim que acaba, mesmo sem replay):**  
  Incluir na mesma seção (ou em um bloco “Última transmissão”) as lives com `status === 'ENDED'` mesmo sem `cloudflarePlaybackId`. No card: título da live, thumbnail, data de fim e texto tipo “Replay em breve” ou “Assistir quando disponível”; o link continua sendo `/live/[id]`, onde o usuário já vê “O jogo acabou” e o aviso de que o replay virá na home. Assim o “último jogo ao vivo” aparece na home logo que a live termina; quando o replay for vinculado, o mesmo card pode passar a mostrar “REPLAY” e o player em `/live/[id]`.

**Recomendação:** Opção A se não quiser mostrar nada antes do replay; Opção B se quiser que “o último jogo ao vivo” apareça na home assim que a live acaba (com “replay em breve” até o admin preencher o playback).

### 3.2 “Disponível em todos os jogos” (`/jogos`)

Hoje a lista de `/jogos` vem só de `Game`. Para replays de live ficarem disponíveis em “todos os jogos”:

**Opção 1 – Aba ou seção “Replays de live” em `/jogos`**

- Na página `/jogos`, além da listagem atual (Game), ter uma **aba** ou **seção** tipo “Replays de transmissão ao vivo”.
- Ao escolher essa aba/seção, listar **Live** com `cloudflarePlaybackId` não nulo (mesma regra da home), ordenadas por `endAt` desc, com paginação se fizer sentido.
- Cada item: mesmo estilo de card (título, thumbnail, data), link para `/live/[id]`, badge “Replay de live” ou “Ao vivo”.

**Opção 2 – Lista unificada com tipo**

- Uma única lista em `/jogos` que mistura:
  - **Game** (jogos gravados)
  - **Live** com replay (`cloudflarePlaybackId` preenchido)
- Ordenação por data (ex.: `gameDate` do Game e `endAt` da Live), mais recente primeiro.
- Cada card indica o tipo: “Jogo gravado” vs “Replay de live” (badge ou subtítulo) e o link (Game → `/jogo/[slug]`, Live → `/live/[id]`).
- Filtros existentes (time, campeonato, ano, categoria) continuam aplicados aos **Games**; para as lives pode ser “todos os replays” ou filtro por período.

**Opção 3 – Filtro “Tipo” em `/jogos`**

- Manter uma lista principal e adicionar filtro **“Tipo”**: “Jogos gravados” | “Replays de live” | “Todos”.
- “Jogos gravados”: só `Game` (comportamento atual).
- “Replays de live”: só `Live` com `cloudflarePlaybackId`.
- “Todos”: união das duas listas ordenadas por data (como na Opção 2), com badge por tipo.

**Recomendação:** Opção 1 ou 3 são as mais simples de explicar; Opção 2 dá uma experiência mais “tudo junto” em um único feed.

---

## 4. Resumo do que fazer (quando for implementar)

| Onde | O que fazer |
|------|-------------|
| **Home** | (1) Ajustar título da seção para “Replay de Jogos Ao Vivo” (ou equivalente). (2) Decidir: só mostrar quando tiver replay (Opção A) ou mostrar “último ao vivo” assim que acaba com “Replay em breve” (Opção B). (3) Manter ordenação por `endAt` desc para o último aparecer primeiro. |
| **`/jogos`** | Incluir replays de live: ou aba/seção “Replays de live” (Opção 1), ou lista unificada com badge de tipo (Opção 2), ou filtro “Tipo: Jogos gravados | Replays de live | Todos” (Opção 3). Em todos os casos, listar `Live` com `cloudflarePlaybackId` e link para `/live/[id]`. |
| **Dados** | Nenhuma mudança de modelo no banco: continuar usando `Live` com `cloudflarePlaybackId` e `endAt`; a home já usa isso; `/jogos` passaria a consultar também a tabela Live. |

Nada disso exige implementar agora; quando for fazer, seguir esse roteiro e escolher as opções (A ou B na home; 1, 2 ou 3 em `/jogos`).

---

## 5. Identificação automática de fim da live (quando o admin não coloca hora final)

Hoje o sistema só considera “live acabou” quando existe **`endAt`** e a hora passou, ou quando o admin marca **ENDED** manualmente. Se o admin não preencher o horário de fim, a live fica para sempre como LIVE.

Para identificar **automaticamente** que a transmissão acabou (sem depender de `endAt`), dá para usar o **Cloudflare Stream** de duas formas:

### 5.1 Webhook do Cloudflare (recomendado)

O Cloudflare Stream Live envia **webhooks** quando o input conecta ou desconecta:

- **`live_input.connected`** — quando a transmissão começa a receber sinal.
- **`live_input.disconnected`** — quando a transmissão **para de receber sinal** (ex.: OBS encerrou, cabo caiu). É o evento de “transmissão acabou”.
- **`live_input.errored`** — quando há erro (codec, GOP, etc.).

O payload traz `input_id` (é o mesmo que nosso **`cloudflareLiveInputId`** da live).

**Como implementar:**

1. **Criar uma rota de webhook** no projeto, por exemplo:  
   `POST /api/webhooks/cloudflare-live`  
   - Receber o body (JSON) do Cloudflare.  
   - Validar origem (se o Cloudflare permitir assinatura/secret, validar).  
   - Se `event_type === 'live_input.disconnected'`:  
     - Buscar no banco a **Live** com `cloudflareLiveInputId === data.input_id`.  
     - Se existir e `status === 'LIVE'`, atualizar para **`status: 'ENDED'`**.  
   - Responder 200 para o Cloudflare não reenviar.

2. **Configurar no Cloudflare:**  
   - Dashboard → **Notifications** → **Destinations** → criar webhook com a URL pública do seu site, ex.: `https://flygames.app/api/webhooks/cloudflare-live`.  
   - Em **Stream** → notificação **Stream Live Input**, ativar **live_input.disconnected** (e opcionalmente connected/errored).  
   - Se quiser só para certas lives, preencher a lista de Input IDs; senão deixar em branco para receber de todos.

Assim, quando o OBS (ou o encoder) parar de enviar sinal, o Cloudflare dispara `live_input.disconnected` e nosso backend marca a live como ENDED mesmo sem `endAt`. O usuário, ao recarregar a página da live, já vê “O jogo acabou” e “em breve na Home”.

### 5.2 Polling pela API do Cloudflare (alternativa)

Se não quiser usar webhook (ou como complemento), dá para **consultar periodicamente** a API do Cloudflare:

- **Endpoint:** `GET /accounts/{account_id}/stream/live_inputs/{live_input_uid}/videos`  
  (o projeto já usa algo parecido em `getLiveInputVideos` em `src/lib/cloudflare-live.ts`.)
- Na resposta, cada vídeo tem um **state**:  
  - **`live-inprogress`** = transmissão ainda ativa.  
  - **`ready`** = gravação finalizada.
- **Lógica:** Um cron (ou job agendado) a cada X minutos: para cada **Live** com `status === 'LIVE'` e `cloudflareLiveInputId` preenchido, chamar a API. Se **não** existir nenhum vídeo com `state: 'live-inprogress'` (ou a API indicar que não há stream ativo), atualizar a live para **ENDED**.

A documentação do Cloudflare menciona que a lista de vídeos do live input reflete o estado; vale confirmar na resposta se existe um campo explícito de “stream ativo” ou só a ausência de `live-inprogress`. O webhook evita polling e dá o sinal na hora em que a transmissão cai.

### 5.3 Resumo

| Método | Vantagem | Desvantagem |
|--------|----------|-------------|
| **Webhook `live_input.disconnected`** | Fim da live detectado na hora; não precisa de cron; não depende de `endAt`. | Exige configurar o webhook no dashboard do Cloudflare e expor uma URL pública. |
| **Polling na API** | Não exige webhook; pode rodar só no seu servidor. | Atraso de alguns minutos; precisa de job agendado e lógica para “nenhum vídeo live-inprogress”. |

Recomendação: implementar o **webhook** (seção 5.1). Se o admin não preencher a hora final, o sistema mesmo assim marcará a live como ENDED quando a transmissão parar, e a mensagem “O jogo acabou / em breve na Home” aparecerá normalmente na página do player.

