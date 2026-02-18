-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "reset_token" TEXT,
    "reset_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "payment_gateway" TEXT,
    "external_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "founded_year" INTEGER,
    "colors" TEXT,
    "crest_url" TEXT,
    "instagram" TEXT,
    "whatsapp" TEXT,
    "description" TEXT,
    "responsible_name" TEXT,
    "responsible_email" TEXT,
    "panel_access_token" TEXT,
    "panel_token_expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "approval_status" TEXT NOT NULL DEFAULT 'approved',
    "payout_pix_key" TEXT,
    "payout_name" TEXT,
    "payout_document" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_managers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "number" INTEGER,
    "position" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "championship" TEXT NOT NULL,
    "game_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "video_url" TEXT,
    "thumbnail_url" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "category_id" TEXT,
    "home_team_id" TEXT,
    "away_team_id" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "periodicity" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "acesso_total" BOOLEAN NOT NULL DEFAULT true,
    "duracao_dias" INTEGER,
    "renovacao_auto" BOOLEAN NOT NULL DEFAULT false,
    "team_payout_percent" INTEGER NOT NULL DEFAULT 0,
    "max_concurrent_streams" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentConfig" (
    "id" TEXT NOT NULL,
    "woovi_api_key" TEXT,
    "woovi_webhook_secret" TEXT,
    "stripe_secret_key" TEXT,
    "stripe_webhook_secret" TEXT,
    "stripe_publishable_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroConfig" (
    "id" TEXT NOT NULL,
    "hero_type" TEXT NOT NULL DEFAULT 'none',
    "hero_media_url" TEXT,
    "overlay_color" TEXT NOT NULL DEFAULT '#000000',
    "overlay_opacity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "video_start_seconds" INTEGER,
    "video_end_seconds" INTEGER,
    "video_loop" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeBanner" (
    "id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "badge_text" TEXT,
    "headline" TEXT,
    "subheadline" TEXT,
    "use_default_cta" BOOLEAN NOT NULL DEFAULT true,
    "primary_cta_text" TEXT,
    "primary_cta_url" TEXT,
    "secondary_cta_text" TEXT,
    "secondary_cta_url" TEXT,
    "media_type" TEXT NOT NULL DEFAULT 'NONE',
    "media_url" TEXT,
    "video_start_seconds" INTEGER NOT NULL DEFAULT 0,
    "video_end_seconds" INTEGER,
    "loop" BOOLEAN NOT NULL DEFAULT true,
    "mute" BOOLEAN NOT NULL DEFAULT true,
    "overlay_color_hex" TEXT NOT NULL DEFAULT '#000000',
    "overlay_opacity" INTEGER NOT NULL DEFAULT 75,
    "height_preset" TEXT NOT NULL DEFAULT 'md',
    "secondary_media_type" TEXT NOT NULL DEFAULT 'NONE',
    "secondary_media_url" TEXT,
    "game_id" TEXT,
    "pre_sale_id" TEXT,
    "live_id" TEXT,
    "show_only_when_ready" BOOLEAN NOT NULL DEFAULT true,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreSaleCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreSaleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreSaleGame" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "video_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PRE_SALE',
    "special_category_id" TEXT NOT NULL,
    "grade_category_id" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "max_simultaneous_per_club" INTEGER NOT NULL,
    "club_a_price" DOUBLE PRECISION NOT NULL,
    "club_b_price" DOUBLE PRECISION NOT NULL,
    "funded_clubs_count" INTEGER NOT NULL DEFAULT 0,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreSaleGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreSaleGameCategory" (
    "id" TEXT NOT NULL,
    "pre_sale_game_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreSaleGameCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreSaleClubSlot" (
    "id" TEXT NOT NULL,
    "pre_sale_game_id" TEXT NOT NULL,
    "slot_index" INTEGER NOT NULL,
    "club_code" TEXT NOT NULL,
    "responsible_name" TEXT NOT NULL,
    "responsible_email" TEXT,
    "club_name" TEXT NOT NULL,
    "team_member_count" INTEGER NOT NULL,
    "contract_version" TEXT NOT NULL,
    "terms_accepted_at" TIMESTAMP(3) NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "payment_provider" TEXT,
    "payment_reference" TEXT,
    "paid_at" TIMESTAMP(3),
    "credentials_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreSaleClubSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubViewerAccount" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pre_sale_club_slot_id" TEXT NOT NULL,
    "login_username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubViewerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubStreamSession" (
    "id" TEXT NOT NULL,
    "pre_sale_game_id" TEXT NOT NULL,
    "club_code" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT,
    "device_id" TEXT,
    "last_heartbeat_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubStreamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "billing_period" TEXT NOT NULL DEFAULT 'monthly',
    "benefits" TEXT NOT NULL DEFAULT '[]',
    "features_flags" TEXT NOT NULL DEFAULT '{}',
    "team_payout_percent" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorOrder" (
    "id" TEXT NOT NULL,
    "sponsor_plan_id" TEXT NOT NULL,
    "team_id" TEXT,
    "company_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website_url" TEXT,
    "whatsapp" TEXT,
    "logo_url" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "amount_to_team_cents" INTEGER NOT NULL DEFAULT 0,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_gateway" TEXT,
    "external_id" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSponsorshipEarning" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "sponsor_order_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamSponsorshipEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sponsor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website_url" TEXT,
    "logo_url" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'APOIO',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "plan_id" TEXT,
    "team_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "support_email" TEXT,
    "admin_credentials_email" TEXT,
    "whatsapp_number" TEXT,
    "instagram_url" TEXT,
    "tiktok_url" TEXT,
    "youtube_url" TEXT,
    "company_name" TEXT,
    "company_cnpj" TEXT,
    "ga_measurement_id" TEXT,
    "fb_pixel_id" TEXT,
    "tiktok_pixel_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL,
    "from_name" TEXT NOT NULL DEFAULT 'Fly Games',
    "from_email" TEXT NOT NULL DEFAULT 'no-reply@flygames.com.br',
    "reply_to" TEXT,
    "brand_color" TEXT NOT NULL DEFAULT '#22c55e',
    "logo_url" TEXT,
    "support_email" TEXT,
    "whatsapp_url" TEXT,
    "footer_text" TEXT,
    "app_base_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "to_email" TEXT NOT NULL,
    "template_key" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'RESEND',
    "status" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitLog" (
    "id" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "country" TEXT,
    "country_code" TEXT,
    "region" TEXT,
    "region_name" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "timezone" TEXT,
    "isp" TEXT,
    "user_agent" TEXT,
    "page_path" TEXT NOT NULL,
    "referrer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpGeoCache" (
    "id" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "country" TEXT,
    "country_code" TEXT,
    "region" TEXT,
    "region_name" TEXT,
    "city" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "timezone" TEXT,
    "isp" TEXT,
    "cached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpGeoCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "game_id" TEXT,
    "team_id" TEXT,
    "amount_to_team_cents" INTEGER NOT NULL DEFAULT 0,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_gateway" TEXT,
    "external_id" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamPlanEarning" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "purchase_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamPlanEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayEvent" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "game_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Live" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "cloudflare_live_input_id" TEXT,
    "cloudflare_playback_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "require_subscription" BOOLEAN NOT NULL DEFAULT true,
    "allow_one_time_purchase" BOOLEAN NOT NULL DEFAULT false,
    "allow_chat" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Live_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_status" TEXT NOT NULL DEFAULT 'paid',

    CONSTRAINT "live_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_user_id_key" ON "Subscription"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Team_panel_access_token_key" ON "Team"("panel_access_token");

-- CreateIndex
CREATE UNIQUE INDEX "team_managers_user_id_team_id_key" ON "team_managers"("user_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PreSaleCategory_slug_key" ON "PreSaleCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PreSaleGame_slug_key" ON "PreSaleGame"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PreSaleGameCategory_pre_sale_game_id_category_id_key" ON "PreSaleGameCategory"("pre_sale_game_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "PreSaleClubSlot_club_code_key" ON "PreSaleClubSlot"("club_code");

-- CreateIndex
CREATE UNIQUE INDEX "ClubViewerAccount_user_id_key" ON "ClubViewerAccount"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ClubViewerAccount_pre_sale_club_slot_id_key" ON "ClubViewerAccount"("pre_sale_club_slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "ClubViewerAccount_login_username_key" ON "ClubViewerAccount"("login_username");

-- CreateIndex
CREATE UNIQUE INDEX "ClubStreamSession_session_token_key" ON "ClubStreamSession"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSponsorshipEarning_team_id_sponsor_order_id_key" ON "TeamSponsorshipEarning"("team_id", "sponsor_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_token_hash_key" ON "EmailToken"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE UNIQUE INDEX "IpGeoCache_ip_hash_key" ON "IpGeoCache"("ip_hash");

-- CreateIndex
CREATE UNIQUE INDEX "TeamPlanEarning_team_id_purchase_id_key" ON "TeamPlanEarning"("team_id", "purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "Live_cloudflare_live_input_id_key" ON "Live"("cloudflare_live_input_id");

-- CreateIndex
CREATE UNIQUE INDEX "live_purchases_user_id_live_id_key" ON "live_purchases"("user_id", "live_id");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_event_id_key" ON "WebhookEvent"("event_id");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_managers" ADD CONSTRAINT "team_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_managers" ADD CONSTRAINT "team_managers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeBanner" ADD CONSTRAINT "HomeBanner_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeBanner" ADD CONSTRAINT "HomeBanner_pre_sale_id_fkey" FOREIGN KEY ("pre_sale_id") REFERENCES "PreSaleGame"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeBanner" ADD CONSTRAINT "HomeBanner_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "Live"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSaleGame" ADD CONSTRAINT "PreSaleGame_special_category_id_fkey" FOREIGN KEY ("special_category_id") REFERENCES "PreSaleCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSaleGame" ADD CONSTRAINT "PreSaleGame_grade_category_id_fkey" FOREIGN KEY ("grade_category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSaleGameCategory" ADD CONSTRAINT "PreSaleGameCategory_pre_sale_game_id_fkey" FOREIGN KEY ("pre_sale_game_id") REFERENCES "PreSaleGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSaleGameCategory" ADD CONSTRAINT "PreSaleGameCategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "PreSaleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSaleClubSlot" ADD CONSTRAINT "PreSaleClubSlot_pre_sale_game_id_fkey" FOREIGN KEY ("pre_sale_game_id") REFERENCES "PreSaleGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubViewerAccount" ADD CONSTRAINT "ClubViewerAccount_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubViewerAccount" ADD CONSTRAINT "ClubViewerAccount_pre_sale_club_slot_id_fkey" FOREIGN KEY ("pre_sale_club_slot_id") REFERENCES "PreSaleClubSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubStreamSession" ADD CONSTRAINT "ClubStreamSession_pre_sale_game_id_fkey" FOREIGN KEY ("pre_sale_game_id") REFERENCES "PreSaleGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorOrder" ADD CONSTRAINT "SponsorOrder_sponsor_plan_id_fkey" FOREIGN KEY ("sponsor_plan_id") REFERENCES "SponsorPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorOrder" ADD CONSTRAINT "SponsorOrder_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSponsorshipEarning" ADD CONSTRAINT "TeamSponsorshipEarning_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSponsorshipEarning" ADD CONSTRAINT "TeamSponsorshipEarning_sponsor_order_id_fkey" FOREIGN KEY ("sponsor_order_id") REFERENCES "SponsorOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SponsorPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPlanEarning" ADD CONSTRAINT "TeamPlanEarning_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPlanEarning" ADD CONSTRAINT "TeamPlanEarning_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayEvent" ADD CONSTRAINT "PlayEvent_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_purchases" ADD CONSTRAINT "live_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_purchases" ADD CONSTRAINT "live_purchases_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "Live"("id") ON DELETE CASCADE ON UPDATE CASCADE;
