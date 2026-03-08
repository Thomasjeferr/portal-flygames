-- Game: shareCount
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "share_count" INTEGER NOT NULL DEFAULT 0;

-- Live: shareCount
ALTER TABLE "Live" ADD COLUMN IF NOT EXISTS "share_count" INTEGER NOT NULL DEFAULT 0;

-- GameLike
CREATE TABLE IF NOT EXISTS "game_likes" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "game_likes_game_id_user_id_key" ON "game_likes"("game_id", "user_id");

ALTER TABLE "game_likes" ADD CONSTRAINT "game_likes_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_likes" ADD CONSTRAINT "game_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GameComment
CREATE TABLE IF NOT EXISTS "game_comments" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_comments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "game_comments" ADD CONSTRAINT "game_comments_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_comments" ADD CONSTRAINT "game_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LiveLike
CREATE TABLE IF NOT EXISTS "live_likes" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "live_likes_live_id_user_id_key" ON "live_likes"("live_id", "user_id");

ALTER TABLE "live_likes" ADD CONSTRAINT "live_likes_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "Live"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_likes" ADD CONSTRAINT "live_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LiveComment
CREATE TABLE IF NOT EXISTS "live_comments" (
    "id" TEXT NOT NULL,
    "live_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_comments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "live_comments" ADD CONSTRAINT "live_comments_live_id_fkey" FOREIGN KEY ("live_id") REFERENCES "Live"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_comments" ADD CONSTRAINT "live_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
