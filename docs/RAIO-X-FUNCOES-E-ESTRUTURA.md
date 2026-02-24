# Raio-X do Portal Futvar — Funções e Estrutura

Documento de referência com **todas as funções detalhadas**, APIs, páginas e componentes do projeto.

---

## 1. Visão geral

- **Stack:** Next.js (App Router), React, TypeScript, Prisma (PostgreSQL), Tailwind CSS.
- **Autenticação:** sessão via cookie (`portal_session`), bcrypt para senha, tabela `Session`.
- **Conteúdo:** jogos (VOD), lives (Cloudflare Stream Live), pré-estreias (Clubes e Meta), banners hero, planos/assinaturas, times, parceiros, súmulas.

---

## 2. Banco de dados (Prisma)

**Arquivo:** `prisma/schema.prisma`

### Modelos principais

| Modelo | Descrição |
|--------|-----------|
| **User** | Usuário: email, nome, role (user/admin/club_viewer), emailVerified, mustChangePassword, favoriteTeamId, avatarUrl. |
| **Session** | Sessão ativa: userId, token único, expiresAt. |
| **Subscription** | Assinatura: userId, planId, active, startDate, endDate, paymentGateway, externalSubscriptionId. |
| **Plan** | Plano: name, type (unitario/recorrente), periodicity, price, acessoTotal, duracaoDias, teamPayoutPercent, partnerCommissionPercent. |
| **Category** | Categoria de jogos (grade pública): name, slug, order, active. |
| **Team** | Time: name, shortName, slug, crestUrl, instagram, whatsapp, panelAccessToken, approvalStatus, payoutPixKey. |
| **TeamManager** | Responsável pelo time (painel): userId, teamId, role (OWNER/ASSISTANT). |
| **TeamMember** | Elenco: teamId, name, role, number, position, photoUrl. |
| **Game** | Jogo VOD: title, slug, championship, gameDate, videoUrl, thumbnailUrl, displayMode (internal/public_no_media/public_with_media), categoryId, homeTeamId, awayTeamId, homeScore, awayScore, sumulaPublishedAt. |
| **GameSumulaApproval** | Aprovação da súmula por time: gameId, teamId, status (PENDENTE/APROVADA/REJEITADA). |
| **PlayerMatchStats** | Estatísticas do jogador na partida: goals, assists, fouls, yellowCard, redCard, highlight. |
| **Purchase** | Compra de jogo (plano unitário): userId, gameId, planId, paymentStatus, expiresAt. |
| **Live** | Live: title, startAt, endAt, status, requireSubscription, allowOneTimePurchase, cloudflareLiveInputId, cloudflarePlaybackId. |
| **LivePurchase** | Compra avulsa de live: userId, liveId, paymentStatus. |
| **HomeBanner** | Banner do hero: type (MANUAL/FEATURED_*), headline, mediaType, mediaUrl, overlay, heightPreset, customHeightPx, secondaryMedia, gameId/preSaleId/liveId. |
| **PreSaleCategory** | Categoria de pré-estreia: name, slug, type (NORMAL/SPECIAL), **scope (CLUB | META)**. |
| **PreSaleGame** | Pré-estreia: title, status (PRE_SALE/FUNDED/PUBLISHED), metaEnabled, metaExtraPerTeam, baselineHomeSubs/AwaySubs, metaHomeTotal/metaAwayTotal, specialCategoryId (opcional se meta), premiereAt, clubSlots. |
| **PreSaleClubSlot** | Slot de clube na pré-estreia (clubes financiam): preSaleGameId, slotIndex (1 ou 2), etc. |
| **Sponsor** | Patrocinador (empresa): teamId, planId, logoUrl, etc. |
| **SponsorOrder** | Pedido de patrocínio: userId, paymentStatus, etc. |
| **PaymentConfig** | Configuração de pagamento: wooviApiKey, stripeSecretKey, stripeWebhookSecret, stripePublishableKey. |
| **Partner** | Parceiro (afiliado): userId, commissionPercent, approved. |
| **WatchProgress** | Progresso de visualização: userId, gameId, liveId, secondsWatched, etc. |

**Cliente Prisma:** `src/lib/db.ts` — instância singleton `prisma` (PrismaClient).

---

## 3. Lib — Funções detalhadas

### 3.1 `src/lib/access.ts`

| Função | Descrição |
|--------|-----------|
| **hasFullAccess(userId)** | Retorna se o usuário tem assinatura ativa com acesso total (plan.acessoTotal). Considera endDate e plano legado sem plan = acesso total. |
| **canAccessApprovedResults(userId)** | true se hasFullAccess OU existe SponsorOrder pago (patrocinador empresa). |
| **canAccessGame(userId, gameId)** | true se hasFullAccess OU existe Purchase pago do jogo, não expirado, com plan.active. |
| **canAccessGameBySlug(userId, gameSlug)** | Busca game por slug e chama canAccessGame. |
| **canAccessLive(userId, live)** | live = { id, requireSubscription, allowOneTimePurchase }. true se não exige nada; ou requireSubscription e hasFullAccess; ou allowOneTimePurchase e LivePurchase pago. |
| **canAccessLiveById(userId, liveId)** | Busca live e chama canAccessLive. |
| **getGamesAccessMap(userId, gameIds[])** | Retorna `Record<gameId, boolean>` para vários jogos de uma vez (otimizado: uma query de purchases). Usado na home para mostrar "Assistir" vs "Promover time". |

---

### 3.2 `src/lib/auth.ts`

| Função | Descrição |
|--------|-----------|
| **hashPassword(password)** | bcrypt.hash(password, 12). |
| **verifyPassword(password, hash)** | bcrypt.compare. |
| **createSession(userId)** | Cria registro em Session com token UUID e expiresAt (30 dias); retorna o token. |
| **getSession()** | Lê cookie `portal_session`, busca Session com user; se expirada deleta e retorna null. Retorna { userId, email, name, role, mustChangePassword }. |
| **setSessionCookie(token)** | Define cookie portal_session (httpOnly, secure em prod, sameSite lax, maxAge 30 dias). |
| **destroySession()** | Deleta sessão no DB e remove cookie. |
| **hasActiveSubscription(userId)** | Encaminha para hasFullAccess (lib/access). |

---

### 3.3 `src/lib/slug.ts`

| Função | Descrição |
|--------|-----------|
| **slugify(text)** | Normaliza texto para slug: lowercase, trim, espaços → hífen, remove caracteres não alfanuméricos, colapsa hífens, remove hífens das pontas. |
| **uniqueSlug(base, existingSlugs[])** | Retorna slug único: slugify(base) e, se existir, acrescenta -1, -2, … até não existir em existingSlugs. |

---

### 3.4 `src/lib/youtube.ts`

| Função | Descrição |
|--------|-----------|
| **extractYouTubeVideoId(url)** | Extrai ID de 11 caracteres de URLs: watch?v=, youtu.be/, embed/, shorts/, v/. |
| **isYouTubeUrl(url)** | true se string contém youtube.com ou youtu.be. |
| **getYouTubeThumbnailUrl(videoId, quality?)** | Retorna URL da thumbnail (maxresdefault ou hqdefault). |

---

### 3.5 `src/lib/cloudflare-stream.ts`

Cloudflare Stream (VOD). Variáveis de ambiente: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN, CLOUDFLARE_STREAM_CUSTOMER_CODE.

| Função | Descrição |
|--------|-----------|
| **getStreamBaseUrl()** | URL base do player (customer-XXX.cloudflarestream.com). |
| **isStreamVideo(videoUrl)** | true se videoUrl começa com "stream:" e length > 7. |
| **extractStreamVideoId(videoUrl)** | Remove prefixo "stream:" e retorna o id. |
| **toStreamVideoUrl(videoId)** | Retorna "stream:" + videoId. |
| **importFromUrl(url, options?)** | POST /stream/copy: importa vídeo por URL; retorna { videoId }. |
| **createDirectUpload(options?)** | Cria upload TUS; retorna { uploadUrl, videoId }. |
| **getPlaybackToken(videoId, options?)** | Gera token assinado para reprodução (exp, downloadable). |
| **getSignedPlaybackUrl(videoId, expiresInSeconds)** | URL do iframe com token. |
| **getSignedHlsUrl(videoId, expiresInSeconds)** | URL HLS assinada (.m3u8). |
| **getSignedPlaybackUrls(videoId, expiresInSeconds)** | Retorna { iframeUrl, hlsUrl } em uma chamada. |

---

### 3.6 `src/lib/cloudflare-live.ts`

Cloudflare Stream Live (lives e replay). Usa mesmo account/token do Stream.

| Função | Descrição |
|--------|-----------|
| **createLiveInput(options?)** | Cria Live Input; retorna { uid, ingestUrl, streamKey, rtmpsUrl }. |
| **getLiveHlsUrl(liveInputUid)** | URL HLS para transmissão ao vivo. |
| **getReplayHlsUrl(videoUid)** | URL HLS para replay (após gravação). |
| **getLiveInputVideos(liveInputUid)** | Lista vídeos gravados do live input. |

---

### 3.7 `src/lib/payment-config.ts`

| Função | Descrição |
|--------|-----------|
| **getPaymentConfig()** | Busca PaymentConfig mais recente no DB; retorna wooviApiKey, wooviWebhookSecret, stripeSecretKey, stripeWebhookSecret, stripePublishableKey. Cache em memória. |
| **clearPaymentConfigCache()** | Limpa cache (após alterar config no admin). |

---

### 3.8 `src/lib/payments/stripe.ts`

| Função | Descrição |
|--------|-----------|
| **getStripe()** | Retorna instância Stripe (secret key do getPaymentConfig) ou null. |
| **createStripeSubscription(input)** | Cria assinatura Stripe; retorna { clientSecret, subscriptionId }. |
| **createStripePaymentIntent(input)** | Cria PaymentIntent; retorna { clientSecret, paymentIntentId }. |
| **verifyStripeWebhook(payload, signature)** | Verifica assinatura do webhook Stripe. |

---

### 3.9 `src/lib/payments/woovi.ts`

| Função | Descrição |
|--------|-----------|
| **createWooviCharge(input)** | Cria cobrança Woovi (Pix); retorna resposta da API ou null. |
| **verifyWooviWebhookSignature(payload, signatureHeader, secret?)** | Valida assinatura do webhook Woovi. |

---

### 3.10 `src/lib/email/emailService.ts`

| Função | Descrição |
|--------|-----------|
| **normalizeAppBaseUrl(url)** | Normaliza URL base do app (para links em e-mails). |
| **getTemplate(key)** | Carrega template de e-mail por chave (EmailTemplateKey). |
| **sendTransactionalEmail(params)** | Envia e-mail transacional (to, subject, html, templateKey, vars). |
| **sendTestEmail(to, subject, html)** | Envia e-mail de teste; retorna { success, error? }. |
| **sendEmailToMany(...)** | Envia para múltiplos destinatários. |

---

### 3.11 `src/lib/email/templateRenderer.ts`

| Função | Descrição |
|--------|-----------|
| **renderTemplate(htmlBody, vars)** | Substitui placeholders {{key}} no HTML por vars. |
| **extractTextFromHtml(html)** | Extrai texto do HTML (strip tags). |

---

### 3.12 `src/lib/email/tokenUtils.ts`

| Função | Descrição |
|--------|-----------|
| **generateSecureToken()** | Gera token seguro (random bytes). |
| **generateVerificationCode()** | Gera código numérico de verificação. |
| **hashToken(token)** | Hash do token (para guardar no DB). |
| **getExpiryDate()** | Data de expiração padrão. |
| **getVerificationCodeExpiryDate()** | Data de expiração para código de verificação. |

---

### 3.13 `src/lib/email/rateLimit.ts`

Rate limit por IP (e em alguns casos por email). Funções em pares check/increment.

| Função | Descrição |
|--------|-----------|
| **checkLoginRateLimit(ip)** | Verifica se pode tentar login. |
| **incrementLoginRateLimit(ip)** | Incrementa contador de tentativas de login. |
| **checkRegisterRateLimit(ip)** | Idem para cadastro. |
| **incrementRegisterRateLimit(ip)** | Idem. |
| **checkForgotPasswordRateLimit(ip, email)** | Esqueci senha. |
| **incrementForgotPasswordRateLimit(ip, email)** | Idem. |
| **checkPartnerApplyRateLimit(ip)** | Candidatura parceiro. |
| **incrementPartnerApplyRateLimit(ip)** | Idem. |
| **checkSendVerifyEmailRateLimit(ip, email)** | Envio de e-mail de verificação. |
| **incrementSendVerifyEmailRateLimit(ip, email)** | Idem. |
| **checkVerifyEmailRateLimit(ip)** | Verificação de e-mail. |
| **incrementVerifyEmailRateLimit(ip)** | Idem. |
| **checkResetPasswordRateLimit(ip)** | Reset de senha. |
| **incrementResetPasswordRateLimit(ip)** | Idem. |
| **checkSponsorCheckoutRateLimit(ip)** | Checkout patrocinador. |
| **incrementSponsorCheckoutRateLimit(ip)** | Idem. |
| **checkTrackPlayRateLimit(ip)** | Track de play. |
| **incrementTrackPlayRateLimit(ip)** | Idem. |

---

### 3.14 `src/lib/team-portal-auth.ts`

| Função | Descrição |
|--------|-----------|
| **getTeamAccess(teamId)** | Verifica acesso ao painel do time (ex.: token de link ou sessão de manager). |

---

### 3.15 `src/lib/partnerAuth.ts`

| Função | Descrição |
|--------|-----------|
| **getApprovedPartner()** | Retorna parceiro aprovado associado à sessão (se houver). |

---

### 3.16 `src/lib/bannerThumbnail.ts`

| Função | Descrição |
|--------|-----------|
| **getBannerThumbnailUrl(b)** | Dado um objeto tipo banner (com type, gameId, preSaleId, liveId, mediaUrl), retorna URL da thumbnail ou null. |

---

### 3.17 `src/lib/pre-sale/validations.ts` (Zod)

| Schema / Função | Descrição |
|-----------------|-----------|
| **basePreSaleGameSchema** | Objeto base: title, description, thumbnailUrl, videoUrl, specialCategoryId, normalCategoryIds, gradeCategoryId, clubAPrice, clubBPrice, maxSimultaneousPerClub, featured, homeTeamId, awayTeamId, metaEnabled, metaExtraPerTeam, premiereAt. |
| **createPreSaleGameSchema** | base + superRefine: categoria especial obrigatória se !metaEnabled; clubAPrice/clubBPrice > 0 se !metaEnabled; metaExtraPerTeam >= 1 se metaEnabled. |
| **updatePreSaleGameSchema** | base parcial + videoUrl opcional. |
| **clubCheckoutSchema** | responsibleName, responsibleEmail, clubName, clubCode, teamMemberCount, termsAccepted. |
| **heartbeatSchema** | sessionToken, clubCode. |

---

### 3.18 Validators (Zod) — outros

- **bannerSchema.ts:** createHomeBannerSchema, updateHomeBannerSchema (type, media, CTAs, overlay, heightPreset, customHeightPx, secondaryMedia, gameId/preSaleId/liveId, startAt/endAt).
- **teamSchema.ts:** validação de dados de time.
- **sponsorSchema.ts:** patrocinador.
- **sponsorPlanSchema.ts:** plano de patrocínio.
- **sponsorOrderSchema.ts:** pedido de patrocínio.
- **emailSchema.ts:** e-mail (formulários).

---

## 4. API Routes (resumo por grupo)

Todas em `src/app/api/`. Métodos: GET, POST, PATCH, PUT, DELETE conforme a rota.

### 4.1 Autenticação e conta

| Rota | Descrição |
|------|-----------|
| **POST /api/auth/login** | Login: email + senha; rate limit; cria sessão e cookie. |
| **POST /api/auth/logout** | Destrói sessão e cookie. |
| **POST /api/auth/register** | Cadastro de usuário. |
| **GET /api/auth/me** | Retorna usuário atual, assinatura, isPartner. |
| **POST /api/auth/forgot-password** | Envia e-mail de recuperação de senha. |
| **POST /api/auth/reset-password** | Redefine senha com token. |
| **POST /api/auth/change-password** | Altera senha (logado). |
| **POST /api/auth/verify-email** | Verifica e-mail com token/código. |
| **GET /api/account/route** | Dados da conta. |
| **GET/PATCH /api/account/favorite-team** | Time de coração. |
| **GET/PATCH /api/me/profile** | Perfil do usuário. |

### 4.2 Jogos e vídeo (público / autenticado)

| Rota | Descrição |
|------|-----------|
| **GET /api/games** | Lista jogos (públicos); pode filtrar por categoria. |
| **GET /api/games/[slug]** | Detalhe do jogo; inclui canWatch e videoUrl (se tiver acesso). |
| **GET /api/video/stream-playback** | URL assinada de reprodução Stream (gameId, etc.). |
| **GET /api/me/watch-progress** | Progresso de visualização do usuário. |
| **POST /api/me/watch-progress** | Atualiza progresso. |
| **GET /api/me/continue-watching** | Lista “continuar assistindo”. |

### 4.3 Pré-estreia (público / checkout)

| Rota | Descrição |
|------|-----------|
| **GET /api/pre-sale/games** | Lista pré-estreias publicadas. |
| **GET /api/pre-sale/games/[id]** | Detalhe de pré-estreia. |
| **POST /api/pre-sale/checkout** | Checkout pré-estreia (clube ou outro fluxo). |
| **POST /api/pre-sale/login** | Login específico pré-estreia. |
| **POST /api/pre-sale/heartbeat** | Heartbeat de sessão (clubCode, sessionToken). |

### 4.4 Lives e destaque

| Rota | Descrição |
|------|-----------|
| **GET /api/public/live-highlight** | Live em destaque (modo LIVE ou SCHEDULED) para badge no header. |

### 4.5 Banners e configuração pública

| Rota | Descrição |
|------|-----------|
| **GET /api/public/home-banners** | Lista banners ativos para o hero (carrossel). |
| **GET /api/public/site-settings** | Configurações gerais do site. |
| **GET /api/public/stripe-publishable-key** | Chave pública Stripe. |
| **GET /api/public/teams** | Lista times (ex.: seleção de time de coração). |
| **GET /api/public/sponsors** | Patrocinadores (seção da home). |
| **GET /api/hero-config** | Hero legado (se ainda usado). |

### 4.6 Checkout e assinatura

| Rota | Descrição |
|------|-----------|
| **POST /api/checkout** | Checkout de assinatura (Stripe/Woovi). |
| **POST /api/sponsor-checkout** | Checkout de patrocínio. |
| **POST /api/subscription/activate** | Ativação de assinatura (após pagamento). |

### 4.7 Webhooks

| Rota | Descrição |
|------|-----------|
| **POST /api/webhooks/stripe** | Webhook Stripe (pagamento, assinatura). |
| **POST /api/webhooks/woovi** | Webhook Woovi (Pix). |

### 4.8 Upload

| Rota | Descrição |
|------|-----------|
| **POST /api/upload/avatar** | Upload de avatar do usuário. |
| **POST /api/upload/team-crest** | Upload de escudo do time. |
| **POST /api/upload/sponsor-logo** | Upload de logo de patrocinador. |
| **POST /api/upload/member-photo** | Foto de membro do time. |

### 4.9 Admin — geral

| Rota | Descrição |
|------|-----------|
| **GET /api/admin/dashboard** | Dados do dashboard (resumos, pré-estreias clubes, etc.). |
| **GET/PATCH /api/admin/site-settings** | Configurações do site. |
| **GET/PATCH /api/admin/payment-config** | Configuração de pagamento (Woovi/Stripe). |
| **GET/PATCH /api/admin/hero-config** | Hero legado. |

### 4.10 Admin — banners

| Rota | Descrição |
|------|-----------|
| **GET /api/admin/home-banners** | Lista banners. |
| **POST /api/admin/home-banners** | Cria banner. |
| **GET/PATCH/DELETE /api/admin/home-banners/[id]** | Um banner. |
| **POST /api/admin/home-banners/[id]/toggle** | Ativa/desativa. |
| **POST /api/admin/home-banners/[id]/duplicate** | Duplica. |
| **POST /api/admin/home-banners/reorder** | Reordena. |

### 4.11 Admin — jogos

| Rota | Descrição |
|------|-----------|
| **GET /api/admin/games** | Lista jogos. |
| **POST /api/admin/games** | Cria jogo. |
| **GET/PATCH/DELETE /api/admin/games/[id]** | Um jogo. |
| **POST /api/admin/games/reorder** | Reordena. |

### 4.12 Admin — categorias

| Rota | Descrição |
|------|-----------|
| **GET /api/admin/categories/[id]** | Categoria (Grade). |
| **GET/POST /api/admin/pre-sale-categories** | Categorias de pré-estreia (scope CLUB/META). |
| **GET/PATCH/DELETE /api/admin/pre-sale-categories/[id]** | Uma categoria pré-estreia. |

### 4.13 Admin — pré-estreia (jogos)

| Rota | Descrição |
|------|-----------|
| **GET /api/admin/pre-sale-games** | Lista pré-estreias. |
| **POST /api/admin/pre-sale-games** | Cria pré-estreia. |
| **GET/PATCH/DELETE /api/admin/pre-sale-games/[id]** | Uma pré-estreia. |
| **POST /api/admin/pre-sale-games/[id]/recalculate** | Recalcula metas (baseline, totais). |
| **POST /api/admin/pre-sale-games/[id]/generate-codes** | Gera códigos (se aplicável). |

### 4.14 Admin — lives

| Rota | Descrição |
|------|-----------|
| **GET /api/admin/lives** | Lista lives. |
| **POST /api/admin/lives** | Cria live. |
| **GET/PATCH/DELETE /api/admin/lives/[id]** | Uma live. |
| **POST /api/admin/lives/[id]/create-live-input** | Cria Live Input no Cloudflare. |
| **POST /api/admin/lives/[id]/sync-replay** | Sincroniza replay. |

### 4.15 Admin — stream (vídeo)

| Rota | Descrição |
|------|-----------|
| **POST /api/admin/stream/import-from-url** | Importa vídeo por URL (Stream). |
| **POST /api/admin/stream/create-upload** | Cria upload direto (TUS). |

### 4.16 Admin — times

| Rota | Descrição |
|------|-----------|
| **GET /api/admin/teams** | Lista times. |
| **POST /api/admin/teams** | Cria time. |
| **GET/PATCH /api/admin/teams/[id]** | Um time. |
| **POST /api/admin/teams/[id]/approve** | Aprova time. |
| **POST /api/admin/teams/[id]/reject** | Rejeita time. |
| **POST /api/admin/teams/[id]/toggle** | Ativa/desativa. |
| **GET /api/admin/teams/[id]/earnings** | Ganhos do time. |
| **POST /api/admin/teams/[id]/earnings/[earningId]/pay** | Marca ganho como pago. |
| **POST /api/admin/teams/[id]/send-reset-password** | Envia link de redefinição de senha (painel). |

### 4.17 Admin — patrocínios / planos / pedidos

| Rota | Descrição |
|------|-----------|
| **GET /api/admin/patrocinios-por-time** | Lista patrocínios por time. |
| **GET /api/admin/patrocinios-por-time/[teamId]** | Patrocínios de um time. |
| **GET /api/admin/sponsors** | Lista patrocinadores. |
| **POST /api/admin/sponsors** | Cria patrocinador. |
| **GET/PATCH /api/admin/sponsors/[id]** | Um patrocinador. |
| **POST /api/admin/sponsors/[id]/toggle** | Ativa/desativa. |
| **POST /api/admin/sponsors/[id]/duplicate** | Duplica. |
| **GET /api/admin/sponsor-plans/[id]** | Plano de patrocínio. |
| **GET /api/admin/sponsor-orders** | Pedidos de patrocínio. |
| **POST /api/admin/sponsor-orders/[id]/assign-team** | Atribui pedido a time. |
| **GET /api/admin/plans** | Planos de assinatura. |
| **POST /api/admin/subscription/deactivate** | Desativa assinatura (admin). |

### 4.18 Admin — usuários e parceiros

| Rota | Descrição |
|------|-----------|
| **GET /api/admin/users/[id]** | Usuário (detalhe/edição). |
| **GET /api/admin/partners/[id]** | Parceiro. |
| **GET /api/admin/partners/[id]/commissions** | Comissões do parceiro. |

### 4.19 Admin — súmulas e upload

| Rota | Descrição |
|------|-----------|
| **GET /api/admin/sumulas/games** | Jogos para súmulas. |
| **POST /api/admin/upload** | Upload genérico (admin). |

### 4.20 Admin — e-mails

| Rota | Descrição |
|------|-----------|
| **GET/PATCH /api/admin/emails/settings** | Configurações de e-mail. |
| **POST /api/admin/emails/settings/test** | Testa envio. |
| **GET /api/admin/emails/templates** | Lista templates. |
| **GET/POST /api/admin/emails/templates/[key]/test** | Testa template. |

### 4.21 Team portal (painel do time)

| Rota | Descrição |
|------|-----------|
| **GET /api/team-portal/access** | Verifica acesso ao painel. |
| **GET /api/team-portal/teams** | Times do usuário (managers). |
| **GET/PATCH /api/team-portal/teams/[id]** | Um time. |
| **GET /api/team-portal/teams/[id]/members** | Membros. |
| **GET /api/team-portal/teams/[id]/games** | Jogos do time. |
| **GET/PATCH /api/team-portal/teams/[id]/games/[gameId]** | Um jogo (súmula, etc.). |
| **POST /api/team-portal/teams/[id]/games/[gameId]/approve** | Aprova súmula. |
| **POST /api/team-portal/teams/[id]/games/[gameId]/reject** | Rejeita súmula. |
| **GET /api/team-portal/teams/[id]/patrocinios** | Patrocínios do time. |
| **GET /api/team-portal/teams/[id]/earnings** | Ganhos do time. |

### 4.22 Parceiro

| Rota | Descrição |
|------|-----------|
| **GET /api/partner/me** | Dados do parceiro logado. |
| **GET /api/partner/ganhos** | Ganhos do parceiro. |
| **GET /api/partner/indicacoes** | Indicações. |
| **POST /api/public/partners/apply** | Candidatura a parceiro. |

### 4.23 Outros

| Rota | Descrição |
|------|-----------|
| **GET /api/categories** | Lista categorias (grade). |
| **POST /api/track-visit** | Registra visita (analytics). |
| **POST /api/me/purchases/[id]/choose-team** | Escolhe time para compra (crédito ao time). |

---

## 5. Páginas principais (App Router)

- **/** — Home: HeroBannerCarousel, ContinueWatching, LiveNow, seção jogos (Pré-estreia, Pré-estreias com Meta, Últimos jogos, Jogos por campeonato/categoria), FindGame, Sponsors. Usa getGames(), getPreSaleForClubs(), getPreSaleWithMeta(), getLiveReplays(), groupByChampionship(); getSession() + getGamesAccessMap() para badges Assistir vs Promover time.
- **/entrar** — Login.
- **/cadastro** — Cadastro.
- **/recuperar-senha** — Esqueci senha.
- **/verificar-email** — Verificação de e-mail.
- **/verify-email** — Verificação (alternativa).
- **/planos** — Planos e assinatura.
- **/conta** — Conta do usuário (perfil, time de coração).
- **/jogos** — Catálogo de jogos (filtro por categoria).
- **/jogo/[slug]** — Página do jogo: canAccessGameBySlug; se não pode assistir mostra bloqueio + CTA; se pode, VideoPlayer (Stream/YouTube/MP4) e GamePlayTracker.
- **/live/[id]** — Página da live: canAccessLive; countdown se agendada; player HLS se ao vivo ou replay.
- **/resultados** — Resultados (súmulas aprovadas); canAccessApprovedResults.
- **/resultados/[slug]** — Detalhe do resultado.
- **/painel-time/** — Painel do time (acesso, times, membros, jogos, súmulas, patrocínios).
- **/parceiro/** — Área do parceiro (ganhos, indicações, link).
- **/admin/** — Dashboard admin: sidebar (AdminSidebar), jogos, pré-estreia Clubes/Meta, categorias, lives, banners, times, patrocínios, planos, pagamentos, usuários, parceiros, analytics, súmulas, e-mails. Rotas separadas para pré-estreia Clubes (`/admin/pre-estreia`) e Meta (`/admin/pre-estreia-meta`).
- **/politica-de-privacidade** — Política de privacidade.

---

## 6. Componentes principais

### 6.1 Layout e navegação

- **Header** — Menu fixo: logo, Início, Cadastrar time, Área do time, Resultados, usuário (dropdown com createPortal para overlay) ou Entrar/Cadastrar. Badge “Ao vivo” quando há live em destaque. Na home no topo: gradiente para transparente; ao rolar ou em outras páginas: fundo sólido e borda sutil.
- **Footer** — Rodapé (links, etc.).
- **AdminSidebar** — Menu lateral do admin; destaque para pre-estreia vs pre-estreia-meta por pathname.

### 6.2 Home e hero

- **HeroBannerCarousel** — Carrossel de banners: busca /api/public/home-banners; suporta IMAGE, YOUTUBE_VIDEO, MP4_VIDEO; overlay; heightPreset + customHeightPx; object-cover e em 2xl object-contain + object-right; janelinha (secondaryMedia); fallback com hero-pattern e grass-gradient.
- **ContinueWatchingSection** — “Continuar assistindo” (dados de /api/me/continue-watching).
- **LiveNowSection** — Destaque de live (agendada ou ao vivo).
- **FindGameSection** — Busca de jogos.
- **SponsorsSection** — Carrossel de patrocinadores (dados públicos).

### 6.3 Cards e listagens

- **GameCard** — Card de jogo: thumbnail, título ou logos dos times, campeonato, data. Props: slug, title, championship, thumbnailUrl, gameDate, featured, href, badgeText, showAssistir, homeTeam, awayTeam, **locked**, **lockedBadgeText**. Se showAssistir e !locked: badge “ASSISTIR” + overlay com play. Se locked: só badge “Promover time” (ou lockedBadgeText) e chip no hover abaixo da thumb.
- **PlayerMatchInfo** — Exibe título, times (mandante x visitante), subtítulo (campeonato, data).

### 6.4 Vídeo e player

- **VideoPlayer** — Reprodução: Cloudflare Stream (iframe ou HLS), YouTube embed ou MP4; recebe streamPlaybackUrl, streamHlsUrl, gameId.
- **StreamCustomPlayer** — Player HLS para lives (Video.js ou similar).
- **GamePlayTracker** — Registra progresso de visualização (gameId).

### 6.5 Outros

- **BuyGameButton** — Botão para comprar jogo avulso (abre modal ou redireciona).
- **LiveCountdown** — Countdown para live agendada (startAt, title).
- **TeamPicker** / **TeamDisplay** — Seleção e exibição de time (conta, favorito).
- **VisitTracker** — Rastreamento de visita (analytics).
- **AnalyticsScripts** — Scripts de analytics (GA, etc.).

### 6.6 Admin

- **AdminShell** — Layout base do admin.
- **AdminTable** — Tabela genérica.
- **AdminAlerts** — Alertas no dashboard.
- **AdminKpiCard** — Card de KPI (título, valor, subtítulo, ícone).
- **AdminLineChart** — Gráfico de linhas.
- **AnalyticsMap** / **AnalyticsMapInner** — Mapa de visitas.
- **BannerForm** — Formulário de banner: tipo, mídia, overlay, altura (preset + customHeightPx), CTAs, janelinha.
- **BannerPreviewPlaceholder** — Placeholder de preview do banner.
- **StreamVideoField** — Campo de vídeo (Stream: import URL, upload direto).

---

## 7. Middleware

**Arquivo:** `src/middleware.ts`

- **Matcher:** `/admin/:path*`
- **Lógica:** Se o path é admin e não há cookie `portal_session` e não é a página de login do admin (`/admin/entrar`), redireciona para `/admin/entrar`. Caso contrário, next().

---

## 8. Fluxos importantes (resumo)

1. **Acesso a jogo:** getSession() → getGamesAccessMap(userId, gameIds) ou canAccessGame/canAccessGameBySlug; na home os cards usam gameAccessMap para showAssistir/locked/lockedBadgeText.
2. **Acesso a live:** canAccessLive(userId, { id, requireSubscription, allowOneTimePurchase }); considera assinatura e compra avulsa.
3. **Pré-estreia Clubes:** status PRE_SALE/FUNDED; metaEnabled false; specialCategoryId obrigatório; checkout por clube (slots).
4. **Pré-estreia Meta:** metaEnabled true; metaExtraPerTeam; barras por time (assinantes atuais vs meta); specialCategoryId opcional; CTA “Ser Patrocinador Torcedor”.
5. **Hero:** Banners com type MANUAL ou FEATURED_*; altura por preset ou customHeightPx; em 2xl object-contain + object-right para não cortar em 4K.
6. **Menu (Header):** Na home, no topo: gradiente from-futvar-darker to transparent; ao scroll ou em outras páginas: bg sólido + border sutil. Dropdown do usuário com createPortal (overlay em body) para fechar ao clicar fora.

---

*Documento gerado para referência técnica do Portal Futvar. Atualize conforme novas funções e rotas forem adicionadas.*
