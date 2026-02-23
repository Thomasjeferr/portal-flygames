-- CreateTable
CREATE TABLE "watch_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "position_seconds" INTEGER NOT NULL,
    "duration_seconds" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watch_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watch_progress_user_id_game_id_key" ON "watch_progress"("user_id", "game_id");

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
