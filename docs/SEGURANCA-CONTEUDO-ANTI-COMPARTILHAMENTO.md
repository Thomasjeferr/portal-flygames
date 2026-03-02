# Segurança de conteúdo – métodos para evitar compartilhamento indevido

Este documento descreve **todos os métodos de segurança** usados no portal para que apenas usuários autorizados acessem o conteúdo (vídeos, súmulas, pré-estreia) e para dificultar o compartilhamento com quem não tem permissão.

---

## 1. Autenticação e sessão (base de tudo)

- **Cookie de sessão** (`portal_session`): token UUID armazenado em cookie **httpOnly**, **secure** em produção e **sameSite: lax**, com validade de 30 dias.
- **Validação**: em cada requisição protegida usa-se `getSession()` que lê o cookie, busca o registro em `Session` no banco e verifica `expiresAt`. Sessão expirada é removida e o usuário deixa de estar “logado”.
- **Sem token no cliente**: o token de sessão não é exposto ao JavaScript (httpOnly), então não dá para copiar “token de login” e colar em outro navegador de forma trivial.

**Arquivos**: `src/lib/auth.ts` (createSession, getSession, setSessionCookie, destroySession).

---

## 2. Jogos (catálogo principal) – quem pode assistir

- **Regra de acesso**: o usuário só pode assistir um jogo se:
  - tiver **assinatura ativa** com **acesso total** (`hasFullAccess`), ou
  - tiver **comprado aquele jogo** (compra paga, plano ativo e não expirado).
- **Checagem server-side em toda entrega de vídeo**:
  - **Página do jogo** (`/jogo/[slug]`): usa `canAccessGameBySlug(session.userId, slug)`. Só se `canWatch === true` a página monta o player e o servidor gera URLs assinadas (HLS/iframe).
  - **API de metadados** `GET /api/games/[slug]`: retorna `videoUrl: canWatch ? game.videoUrl : null`. Quem não tem acesso não recebe a URL nem o `videoId`.
  - **API de reprodução** `GET /api/video/stream-playback`: quando chamada com `gameSlug`, exige sessão e chama `canAccessGameBySlug(session.userId, gameSlug)`. Se não tiver acesso, responde 403 e **não devolve** `playbackUrl` nem `hlsUrl`.

Ou seja: **não há como “achar a URL do vídeo” na página do player**; a URL só existe depois de o servidor checar acesso e gerar uma URL assinada (ver item 4).

**Arquivos**: `src/lib/access.ts` (canAccessGame, canAccessGameBySlug, hasFullAccess), `src/app/jogo/[slug]/page.tsx`, `src/app/api/games/[slug]/route.ts`, `src/app/api/video/stream-playback/route.ts`.

---

## 3. URLs de vídeo nunca “fixas” no cliente (Cloudflare Stream)

- **Vídeos no catálogo**: o `videoUrl` no banco é no formato `stream:VIDEO_ID` (identificador interno). O cliente **nunca** recebe a URL HLS direta do Cloudflare de forma persistente.
- **Entrega ao player**: o servidor gera **URLs assinadas** com validade limitada (ex.: 1 hora) via Cloudflare Stream API (`getPlaybackToken` → token na URL). Quem não passar pela nossa API não obtém essa URL.
- **Vídeos importados/criados no admin**: upload e import usam `requireSignedURLs: true`. Assim, mesmo que alguém descubra o `VIDEO_ID`, não consegue reproduzir sem um token assinado gerado por nós.

**Arquivos**: `src/lib/cloudflare-stream.ts` (getPlaybackToken, getSignedPlaybackUrl, getSignedHlsUrl, getSignedPlaybackUrls), `src/app/api/admin/stream/create-upload/route.ts`, `src/app/api/admin/stream/import-from-url/route.ts`.

---

## 4. Geração de URL de reprodução só após checagem de acesso

- **Fluxo para jogo (catálogo)**:
  1. Página do jogo: servidor checa `canAccessGameBySlug`; se OK, chama `getSignedPlaybackUrls(videoId, 3600)` no servidor e injeta `streamHlsUrl` (e se aplicável iframe) na página.
  2. Alternativa: o cliente chama `GET /api/video/stream-playback?videoId=...&gameSlug=...` com cookie de sessão; a API valida acesso pelo `gameSlug` e só então gera e retorna `playbackUrl` e `hlsUrl`.
- **Fluxo para pré-estreia**: o cliente chama a mesma API com `preSaleSlug` e `sessionToken`. A API só gera URLs se o `sessionToken` for válido para aquele jogo e não expirado (ver item 5).

Assim, **compartilhar o link da página do jogo não basta**: o visitante precisa estar logado com uma conta que tenha acesso; sem isso não recebe URL de vídeo.

**Arquivos**: `src/app/api/video/stream-playback/route.ts`, `src/app/jogo/[slug]/page.tsx`, `src/components/VideoPlayer.tsx` (uso de `streamContext` para buscar URL via API).

---

## 5. Pré-estreia (clubes) – sessão por dispositivo e limite de simultâneos

- **Código do clube** ou **login como “club viewer”**: para obter sessão de visualização, é obrigatório enviar um código de clube válido (e pago) ou estar logado com conta de visualizador do clube para aquele jogo.
- **Sessão de streaming** (`ClubStreamSession`): ao iniciar a visualização, o backend gera um `sessionToken` único (`pss_` + 32 bytes hex), com **TTL de 90 segundos**. O token é vinculado ao jogo, ao código do clube e a um `expiresAt`.
- **Heartbeat**: o player envia heartbeat (POST com `sessionToken` e `clubCode`). A cada heartbeat válido o servidor **renova** o `expiresAt` (mais 90 s). Se o usuário fechar a aba ou parar o player, o heartbeat para e a sessão **expira** em no máximo 90 s.
- **Limite de dispositivos simultâneos**: antes de criar uma nova sessão, o servidor conta quantas `ClubStreamSession` ativas (não expiradas) existem para aquele `preSaleGameId` + `clubCode`. Se já houver `maxSimultaneousPerClub`, não cria outra sessão (403). Isso reduz compartilhamento de “um login, várias telas ao mesmo tempo”.
- **Uso do token na reprodução**: a API `GET /api/video/stream-playback` com `preSaleSlug` só retorna URLs assinadas se receber um `sessionToken` válido (existente, não expirado e vinculado àquele jogo) ou se for admin/assinante com acesso total. Sem token válido, 403.

Resumo: **pré-estreia exige código do clube ou conta de clube, sessão de 90 s renovada por heartbeat e limite de sessões simultâneas por clube.**

**Arquivos**: `src/app/api/pre-sale/start-session/route.ts`, `src/app/api/pre-sale/heartbeat/route.ts`, `src/app/api/video/stream-playback/route.ts`, `src/lib/pre-sale/enums.ts` (SESSION_TTL_SECONDS), modelo `ClubStreamSession` no Prisma.

---

## 6. Resultados (súmulas aprovadas) – só para quem pode ver

- **Página de listagem** `/resultados`: exige sessão. Se não houver, redireciona para cadastro/entrar.
- **Quem tem permissão**: `canAccessApprovedResults(userId)` retorna true se o usuário tem **assinatura ativa com acesso total** ou tem pelo menos um **SponsorOrder pago** (patrocinador empresa). Sem uma dessas condições, não vê a lista nem os detalhes.
- **Página de detalhe** `/resultados/[slug]`: é Server Component que lê do banco; só renderiza a súmula se o jogo existir, estiver com súmula publicada e **ambos os times tiverem aprovado**. Não há API pública que devolva súmula sem estar logado/autorizado no contexto da página (que já é protegida por sessão e pela regra de resultados).

**Arquivos**: `src/lib/access.ts` (canAccessApprovedResults), `src/app/resultados/page.tsx`, `src/app/resultados/[slug]/page.tsx`.

---

## 7. Área administrativa e painel do time

- **Admin**: layout `/admin` verifica sessão e `session.role === 'admin'`. Se não for admin, redireciona. APIs em `/api/admin/*` repetem a checagem `getSession()` + `session.role !== 'admin'` e retornam 403 quando necessário.
- **Painel do time**: acesso a `/painel-time` e APIs em `/api/team-portal/*` exigem que o usuário seja **gestor do time** (TeamManager ou e-mail igual ao `responsibleEmail` do time aprovado). O link mágico de acesso usa token de uso único (consumido ao trocar por cookie de sessão).

Assim, **conteúdo sensível (admin e gestão de time) não é acessível só com “link compartilhado”**; é preciso estar logado com a conta certa.

**Arquivos**: `src/app/admin/(dashboard)/layout.tsx`, `src/lib/team-portal-auth.ts`, `src/app/painel-time/acesso/page.tsx`, `src/app/api/team-portal/access/route.ts`, diversas rotas em `src/app/api/admin/*`.

---

## 8. Resumo em uma tabela

| Camada | O que faz |
|--------|-----------|
| **Sessão httpOnly** | Token de login não acessível ao JS; não dá para “copiar sessão” facilmente. |
| **Acesso por jogo** | Só assinante acesso total ou quem comprou aquele jogo; checado na página e na API de stream. |
| **videoUrl no cliente** | API `/api/games/[slug]` só envia `videoUrl` se `canWatch`; página do jogo só monta player se tiver acesso. |
| **URLs assinadas (Stream)** | HLS/iframe com token de curta duração (ex.: 1 h); geradas no servidor só após validar acesso. |
| **requireSignedURLs** | Vídeos no Cloudflare exigem token; não há URL pública permanente do vídeo. |
| **API stream-playback** | Só retorna URLs de reprodução se sessão + canAccess (jogo) ou sessionToken válido (pré-estreia). |
| **Pré-estreia: sessionToken** | Token de 90 s renovado por heartbeat; expira se parar de assistir; limitado por clube. |
| **Pré-estreia: simultâneos** | `maxSimultaneousPerClub` limita quantas sessões ativas por clube ao mesmo tempo. |
| **Resultados** | Só para assinante acesso total ou patrocinador pago; página e lógica atrás de sessão. |
| **Admin / painel time** | Acesso por role (admin) ou vínculo de gestor (time); APIs checam em toda chamada. |

---

## 9. O que não temos (limitações)

- **DRM (Widevine/PlayReady)**: não há criptografia de mídia no player; quem obtiver uma URL HLS assinada válida pode gravar a tela ou o stream enquanto o token estiver válido.
- **Marcação d’água por usuário**: não há identificação visível do assinante no vídeo para rastrear vazamento.
- **Limite de dispositivos por conta** (catálogo): não há “máximo de dispositivos” por usuário para jogos normais; apenas pré-estreia tem limite por clube.
- **Revogação imediata de sessão**: ao “sair” do site o cookie é removido, mas não há invalidação em tempo real de todas as sessões daquele usuário em outros dispositivos.

Essas lacunas podem ser consideradas em evoluções futuras se o foco for endurecer ainda mais contra compartilhamento ou gravação.
