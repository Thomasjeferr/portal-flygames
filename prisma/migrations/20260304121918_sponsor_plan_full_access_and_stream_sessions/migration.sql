-- AlterTable
ALTER TABLE "SponsorPlan" ADD COLUMN     "grant_full_access" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_screens" INTEGER;

-- CreateTable
CREATE TABLE "UserStreamSession" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "last_heartbeat_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStreamSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserStreamSession_user_id_idx" ON "UserStreamSession"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreamSession_user_id_device_id_key" ON "UserStreamSession"("user_id", "device_id");

-- AddForeignKey
ALTER TABLE "UserStreamSession" ADD CONSTRAINT "UserStreamSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
