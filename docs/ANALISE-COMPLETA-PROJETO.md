# Análise completa do projeto Portal Futvar (Fly Games)

Documento gerado a partir da análise do repositório. Descreve stack, estrutura, entidades, fluxos e funcionalidades.

---

## 1. Visão geral

**Nome:** Portal Futvar / Fly Games  
**Tipo:** Plataforma de streaming de futebol de várzea (vídeos filmados com drones), com assinaturas, lives, pré-estreias, patrocínios e programa de parceiros.

**Stack principal:**
- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Prisma** + **PostgreSQL**
- **Tailwind CSS**
- **Stripe** e **Woovi** (Pix) para pagamentos
- **Resend** para e-mails transacionais
- **Cloudflare Stream** (VOD) e **Cloudflare Stream Live** (lives)
- **Vercel Blob** para uploads
- **Recharts**, **Leaflet** (mapas), **HLS.js** / **Video.js** para player

---

## 2. Estrutura de pastas (src)

```
src/
├── app/                    # Rotas Next.js (App Router)
│   ├── api/                # API Routes (~138 rotas)
│   ├── admin/              # Painel admin (dashboard + auth)
│   ├── painel-time/        # Painel do time (por token)
│   ├── parceiro/           # Área do parceiro (comissões, link, indicações)
│   ├── patrocinar/         # Páginas de patrocínio
│   ├── pre-estreia/        # Pré-estreias (assistir, checkout)
│   ├── conta/              # Conta do usuário
│   ├── checkout/           # Checkout de planos
│   ├── entrar/             # Login público
│   ├── cadastro/           # Cadastro
│   ├── jogos/              # Listagem de jogos
│   ├── jogo/[slug]/        # Página do jogo (player)
│   ├── live/[id]/          # Página da live
│   ├── planos/             # Planos de assinatura
│   ├── resultados/         # Resultados (patrocinadores)
│   ├── times/              # Times (cadastrar time)
│   └── ...                 # termos, política, suporte, etc.
├── components/             # Componentes React (~41 arquivos)
│   ├── admin/              # Sidebar, tabelas, formulários, analytics
│   ├── player/             # VideoPlayer, controles, progresso
│   ├── match/              # Página do jogo, placar
│   ├── account/            # Time picker, CTA “não encontrou time”
│   └── ...
├── lib/                    # Lógica compartilhada
│   ├── auth.ts, access.ts, db.ts
│   ├── payments/           # stripe, woovi, wooviPurchaseHandler
│   ├── email/              # emailService, tokenUtils, templateRenderer, rateLimit
│   ├── validators/         # Zod: banner, sponsor, sponsorOrder, team, email
│   ├── pre-sale/           # validations, enums
│   ├── cloudflare-stream.ts, cloudflare-live.ts
│   ├── youtube.ts, slug.ts, payment-config.ts, payoutRules.ts
│   ├── partnerAuth.ts, team-portal-auth.ts
│   └── bannerThumbnail.ts
└── ...
```

---

## 3. Banco de dados (Prisma)

**Arquivo:** `prisma/schema.prisma`  
**Provider:** PostgreSQL (`DATABASE_URL`, `DIRECT_DATABASE_URL`).

### 3.1 Usuários e sessão
- **User** – id, email, name, passwordHash, role (user | admin | club_viewer), emailVerified, mustChangePassword, resetToken/Expires, favoriteTeamId, avatarUrl.
- **Session** – userId, token único, expiresAt (sessão por cookie).

### 3.2 Assinatura e planos
- **Subscription** – userId, planId, active, startDate, endDate, paymentGateway (stripe | woovi | manual), externalSubscriptionId.
- **Plan** – name, type (unitario | recorrente), periodicity, price, description, acessoTotal, duracaoDias, renovacaoAuto, featured, teamPayoutPercent, partnerCommissionPercent, maxConcurrentStreams.

### 3.3 Conteúdo (grade e jogos)
- **Category** – name, slug, order, active (categorias da grade).
- **Game** – title, slug, championship, gameDate, description, videoUrl, thumbnailUrl, featured, categoryId, homeTeamId, awayTeamId, displayMode (internal | public_no_media | public_with_media), homeScore, awayScore, venue, referee, sumulaPublishedAt.
- **GameSumulaApproval** – aprovação da súmula por time (gameId, teamId, status: PENDENTE | APROVADA | REJEITADA).
- **PlayerMatchStats** – estatísticas por jogador na partida (goals, assists, fouls, cartões, highlight).

### 3.4 Times
- **Team** – name, shortName, slug, city, state, crestUrl, instagram, whatsapp, description, responsibleName/Email, panelAccessToken, panelTokenExpiresAt, isActive, approvalStatus, payoutPixKey, payoutName, payoutDocument.
- **TeamManager** – userId, teamId, role (OWNER | ASSISTANT).
- **TeamMember** – elenco (name, role, number, position, photoUrl).
- **TeamRequest** – solicitação de cadastro de time (torcedor pediu time que não existe).

### 3.5 Pré-estreia
- **PreSaleCategory** – name, slug, type (NORMAL | SPECIAL), scope (CLUB | META).
- **PreSaleGame** – title, status (PRE_SALE | FUNDED | PUBLISHED), metaEnabled, metaExtraPerTeam, baselineHomeSubs/AwaySubs, metaHomeTotal/metaAwayTotal, specialCategoryId, gradeCategoryId, clubAPrice, clubBPrice, fundedClubsCount, slug, homeTeamId, awayTeamId, premiereAt.
- **PreSaleGameCategory** – N:N entre PreSaleGame e PreSaleCategory.
- **PreSaleClubSlot** – slot de clube (pré-estreia clubes): preSaleGameId, slotIndex, clubCode, responsibleName/Email, paymentStatus, etc.
- **ClubViewerAccount** – usuário vinculado a um slot (loginUsername para clube).
- **ClubStreamSession** – sessão de streaming pré-estreia (clubCode, sessionToken, lastHeartbeatAt).

### 3.6 Patrocínio
- **SponsorPlan** – planos de patrocínio: name, price, billingPeriod, benefits (JSON), featuresFlags (JSON), teamPayoutPercent, partnerCommissionPercent, sortOrder, isActive.
- **SponsorOrder** – pedido de patrocínio: sponsorPlanId, teamId, partnerId, userId, companyName, email, logoUrl, amountCents, paymentStatus, UTM.
- **Sponsor** – patrocinador ativo: name, logoUrl, tier (MASTER | OFICIAL | APOIO), priority, planId, teamId, startAt, endAt.
- **TeamSponsorshipEarning** – ganho do time com patrocínio (sponsorOrderId, amountCents, status, paidAt).

### 3.7 Parceiros (afiliados)
- **Partner** – userId, type (revendedor | influencer | lojista | outro), status (pending | approved | rejected | blocked), name, refCode, planCommissionPercent, gameCommissionPercent, sponsorCommissionPercent, pixKey, pixKeyType.
- **PartnerEarning** – sourceType (purchase | sponsor), sourceId, grossAmountCents, commissionPercent, amountCents, status (pending | paid).
- **PartnerWithdrawal** / **PartnerWithdrawalItem** – saques do parceiro.
- **TeamWithdrawal** / **TeamWithdrawalPlanItem** / **TeamWithdrawalSponsorshipItem** – saques do time (planos + patrocínio).

### 3.8 Compras e ganhos
- **Purchase** – userId, planId, gameId, teamId, partnerId, amountToTeamCents, purchasedAt, expiresAt, paymentStatus, paymentGateway, externalId, UTM.
- **TeamPlanEarning** – ganho do time por compra (teamId, purchaseId, amountCents, status, paidAt).

### 3.9 Lives
- **Live** – title, cloudflareLiveInputId, cloudflarePlaybackId, status (SCHEDULED | LIVE | ENDED), startAt, endAt, requireSubscription, allowOneTimePurchase, allowChat, homeTeamId, awayTeamId.
- **LivePurchase** – compra avulsa de live (userId, liveId, paymentStatus).

### 3.10 Configurações e UX
- **HeroConfig** – hero legado (heroType, overlay, vídeo).
- **HomeBanner** – banners inteligentes: type (MANUAL | FEATURED_GAME | FEATURED_PRE_SALE | FEATURED_LIVE), headline, mediaType, mediaUrl, overlay, heightPreset, gameId/preSaleId/liveId, startAt, endAt.
- **PaymentConfig** – wooviApiKey, wooviWebhookSecret, stripeSecretKey, stripeWebhookSecret, stripePublishableKey.
- **SiteSettings** – supportEmail, whatsappNumber, redes, companyName/Cnpj, GA, FB Pixel, TikTok Pixel.
- **EmailSettings**, **EmailTemplate**, **EmailToken**, **EmailLog**, **RateLimit** – e-mails transacionais (Resend).
- **VisitLog**, **IpGeoCache** – analytics/geolocalização.
- **PlayEvent** – evento de play (dashboard).
- **WatchProgress** – continuar assistindo (userId, gameId, positionSeconds, durationSeconds).
- **WebhookEvent** – eventos de webhook (Stripe/Woovi) processados.

---

## 4. Páginas e rotas principais

### 4.1 Público
- **/** – Home: carrossel de banners, continuar assistindo, ao vivo, busca de jogo, pré-estreias (clubes + meta), patrocinadores.
- **/jogos** – Listagem de jogos.
- **/jogo/[slug]** – Página do jogo com player (acesso por assinatura ou compra avulsa).
- **/planos** – Planos de assinatura.
- **/checkout** – Checkout de plano (Woovi/Stripe).
- **/live/[id]** – Página da live (Cloudflare Stream Live).
- **/resultados**, **/resultados/[slug]** – Resultados (patrocinadores aprovados).
- **/patrocinar**, **/patrocinar/comprar** – Patrocínio; **/patrocinar/obrigado** – confirmação.
- **/pre-estreia/assistir/[slug]** – Assistir pré-estreia; **/pre-estreia/[id]/checkout** – checkout pré-estreia.
- **/entrar**, **/cadastro**, **/recuperar-senha**, **/verificar-email**, **/verify-email** – Auth.
- **/conta** – Conta do usuário (perfil, time de coração).
- **/para-times** – Página “para times”.
- **/times/cadastrar** – Cadastro de time.
- **/parceiros** – Página de parceiros; **/parceiro** – área do parceiro (link, comissões, indicações, como funciona).
- **/termos-de-uso**, **/politica-de-privacidade**, **/sobre-nos**, **/suporte**, **/contrato-direitos-imagem** – Institucional.

### 4.2 Admin (`/admin`)
- **/admin/entrar** – Login admin.
- **/admin** – Dashboard.
- **/admin/analytics** – Analytics (mapa, visitas).
- **/admin/jogos**, **/admin/jogos/novo**, **/admin/jogos/[id]/editar** – CRUD jogos.
- **/admin/sumulas**, **/admin/sumulas/[gameId]** – Súmulas (aprovações, estatísticas).
- **/admin/times**, **/admin/times/novo**, **/admin/times/[id]/editar** – CRUD times.
- **/admin/times/[id]/comissoes** – Comissões do time.
- **/admin/team-requests** – Solicitações de times.
- **/admin/lives**, **/admin/lives/novo**, **/admin/lives/[id]/editar** – Lives.
- **/admin/pre-estreia** – Pré-estreia clubes (lista, novo, editar, categorias).
- **/admin/pre-estreia-meta** – Pré-estreia meta (lista, novo, editar, categorias).
- **/admin/categorias** – Categorias da grade.
- **/admin/banner**, **/admin/banner/novo**, **/admin/banner/[id]/editar** – Hero banners.
- **/admin/sponsors**, **/admin/sponsors/new**, **/admin/sponsors/[id]/editar** – Patrocinadores.
- **/admin/sponsors/planos** – Planos de patrocínio.
- **/admin/sponsor-orders** – Pedidos de patrocínio.
- **/admin/patrocinios-por-time** – Patrocínios por time.
- **/admin/partners**, **/admin/partners/[id]** – Parceiros.
- **/admin/saques** – Saques (times + parceiros).
- **/admin/usuarios**, **/admin/usuarios/[id]** – Usuários.
- **/admin/planos**, **/admin/planos/novo**, **/admin/planos/[id]/editar** – Planos.
- **/admin/pagamentos** – Configuração de APIs de pagamento.
- **/admin/emails/settings**, **/admin/emails/templates**, **/admin/emails/templates/[key]** – E-mails.
- **/admin/settings** – Configurações gerais.

### 4.3 Painel do time (`/painel-time`)
- Acesso por token (link enviado por e-mail): **/painel-time**, **/painel-time/acesso**, **/painel-time/alterar-senha**.
- **/painel-time/times/[id]/dados** – Dados do time.
- **/painel-time/times/[id]/elenco** – Elenco.
- **/painel-time/times/[id]/sumulas**, **/painel-time/times/[id]/sumulas/[gameId]** – Súmulas (aprovar/rejeitar).
- **/painel-time/times/[id]/patrocinadores** – Patrocinadores do time.
- **/painel-time/times/[id]/comissoes** – Comissões e saques.

### 4.4 Parceiro (`/parceiro`)
- **/parceiro** – Dashboard.
- **/parceiro/link** – Link de indicação.
- **/parceiro/comissoes** – Comissões e saques.
- **/parceiro/indicacoes** – Indicações.
- **/parceiro/como-funciona** – Como funciona.

---

## 5. APIs (resumo)

- **Auth:** login, register, logout, me, verify-email, send-verify-email, forgot-password, reset-password, change-password.
- **Account:** profile, favorite-team.
- **Checkout:** checkout, availability, purchase/[id]/status, purchase/[id]/sync-woovi.
- **Plans:** listagem pública; admin: CRUD planos.
- **Admin:** users, categories, games, teams, team-requests, lives, pre-sale-games, pre-sale-categories, home-banners, sponsors, sponsor-plans, sponsor-orders, patrocinios-por-time, partners, team-withdrawals, partner-withdrawals, payment-config, sumulas, dashboard, upload, emails (settings, templates), site-settings; ações: approve/reject team, send-reset-password, assign-team (sponsor order), pay withdrawal, receipt.
- **Team portal:** access, teams, teams/[id] (dados, members, games, withdrawals, earnings, patrocinios), games/[id] (approve/reject sumula).
- **Partner:** me, ganhos, withdrawals, indicacoes.
- **Public:** home-banners, site-settings, teams, team-request, live-highlight, partners/apply.
- **Video:** stream-playback (token assinado Cloudflare).
- **Me:** continue-watching, watch-progress, purchases, purchases/[id]/choose-team.
- **Track:** track-play (evento de play).
- **Webhooks:** woovi, stripe.
- **Upload:** avatar, team-crest, member-photo, sponsor-logo; admin/upload.
- **Pre-sale:** checkout pré-estreia.

---

## 6. Lib e regras de negócio

- **access.ts** – hasFullAccess, canAccessGame, canAccessLive, getGamesAccessMap, canAccessApprovedResults.
- **auth.ts** – hashPassword, verifyPassword, createSession, getSession, setSessionCookie, destroySession.
- **payment-config.ts** – getPaymentConfig (Woovi/Stripe), clearPaymentConfigCache.
- **payoutRules.ts** – regras de repasse (time, parceiro) para planos e patrocínio.
- **cloudflare-stream.ts** – VOD: importFromUrl, createDirectUpload, getPlaybackToken, getSignedHlsUrl.
- **cloudflare-live.ts** – Lives: createLiveInput, getLiveHlsUrl, getReplayHlsUrl.
- **email** – emailService (Resend), tokenUtils (verify/reset), templateRenderer, rateLimit.
- **Validators (Zod)** – banner, sponsor, sponsorOrder, sponsorPlan, team, email.
- **partnerAuth.ts** / **team-portal-auth.ts** – autenticação por cookie para parceiro e painel do time.

---

## 7. Funcionalidades de negócio (resumo)

1. **Streaming VOD** – Jogos por assinatura ou compra avulsa; vídeo via Cloudflare Stream (HLS assinado); continuar assistindo (WatchProgress).
2. **Lives** – Cloudflare Stream Live; opção de compra avulsa ou só assinante.
3. **Pré-estreia** – Dois modos: **Clubes** (slots financiados por clubes) e **Meta** (meta de assinantes por time); fluxo de checkout e sessão de streaming controlada.
4. **Patrocínio** – Planos de patrocínio, pedidos com pagamento, vínculo a time; repasse para time; exibição em resultados e na home.
5. **Programa de parceiros** – Cadastro, link de indicação, comissão em planos/jogos/patrocínio; ganhos e saques (Pix).
6. **Times** – Cadastro, aprovação, painel por token; elenco, súmulas (aprovação mandante/visitante), estatísticas de jogadores; comissões e saques (planos + patrocínio).
7. **Súmulas** – Aprovação por time (GameSumulaApproval), estatísticas por jogador (PlayerMatchStats); telas no admin e no painel do time.
8. **Home** – Banners configuráveis (manual ou destaque de jogo/pré-estreia/live); seções: continuar assistindo, ao vivo, busca, pré-estreias, patrocinadores.
9. **Pagamentos** – Woovi (Pix) e Stripe; webhooks; ativação de assinatura/compra; repasses para time e parceiro.
10. **E-mails** – Resend; templates (welcome, verify, reset, etc.); configuração e preview no admin.
11. **Analytics** – VisitLog, geolocalização (IpGeoCache), mapa no admin; GA/FB/TikTok Pixel via SiteSettings.

---

## 8. Documentação existente (docs/)

- **ADMIN-PAGINACAO-ANALISE.md** – Análise de paginação no admin.
- **PARCEIRO-RASTREIO-INDICACAO.md** – Rastreio de indicação do parceiro.
- **PARCEIRO-ABA-COMO-FUNCIONA-IDÉIAS.md** – Ideias para aba “Como funciona”.
- **RAIO-X-FUNCOES-E-ESTRUTURA.md** – Raio-X de funções e estrutura (lib, APIs, páginas).
- **RAIO-X-WOOVI-PAGAMENTO-NAO-RECONHECIDO.md** – Woovi pagamento não reconhecido.
- **RAIO-X-PRE-ESTREIA-CLUBES-VS-META.md** – Pré-estreia clubes vs meta.
- **CHECKLIST-PRE-ESTREIA-META.md**, **PRE-ESTREIA-META-DESENHO.md**, **PRE-ESTREIA-DATA-FIM-ACAO.md** – Pré-estreia meta.
- **HOME-ORGANIZACAO-DESENHO.md** – Organização da home.
- **CONTINUAR-ASSISTINDO-DESENHO.md**, **PLAYER-VERIFICACAO-CONTINUAR-ASSISTINDO.md** – Continuar assistindo.
- **RESULTADOS-APROVADOS-E-PATROCINADORES.md** – Resultados e patrocinadores.
- **SUMULA-APROVACAO-REJEICAO.md**, **SUMULA-PAINEL-TIME.md** – Súmula.
- **JOGO-MODOS-EXIBICAO.md** – Modos de exibição do jogo.
- **CONFIGURAR-EMAILS.md** – Configuração de e-mails.
- **LIVES-CLOUDFLARE-STREAM.md** – Lives com Cloudflare.
- **PAYMENTS.md** – Pagamentos (Woovi + Stripe).
- **PARCEIROS-PERCENTUAL-E-AREA.md** – Percentual e área de parceiros.
- **VERCEL-REDUCAO-CUSTOS.md** – Redução de custos Vercel.
- **PRISMA-GENERATE-EPERM.md** – EPERM no Prisma generate.
- **opcao-a-implementacao-detalhada.md**, **pre-estreia-para-grade-principal.md** – Implementação e pré-estreia.

---

## 9. Scripts (package.json)

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Next.js em desenvolvimento |
| `npm run build` | `prisma generate` + `next build` |
| `npm run start` | Next.js em produção |
| `npm run lint` | next lint |
| `npm run db:generate` | prisma generate |
| `npm run db:push` | prisma db push |
| `npm run db:migrate` | prisma migrate dev |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed admin (tsx prisma/seed.ts) |
| `npm run db:seed-emails` | Seed templates/config e-mail |

---

## 10. Dependências principais

- **next**, **react**, **react-dom** – Framework e UI.
- **@prisma/client** – ORM.
- **bcryptjs** – Hash de senha.
- **zod** – Validação.
- **stripe**, **@stripe/stripe-js**, **@stripe/react-stripe-js** – Pagamentos.
- **resend** – E-mail.
- **recharts** – Gráficos (admin).
- **leaflet**, **react-leaflet** – Mapas (analytics).
- **video.js**, **hls.js** – Player; **videojs-contrib-quality-levels**, **quality-menu** – Qualidade.
- **@vercel/blob** – Storage.
- **tus-js-client** – Upload resumível.
- **uuid** – Identificadores.
- **isomorphic-dompurify** – Sanitização HTML.

---

Este documento serve como índice técnico e funcional do projeto. Para detalhes de implementação de cada fluxo, use os arquivos em `docs/` e o código em `src/`.
