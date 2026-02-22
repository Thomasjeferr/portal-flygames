-- AlterTable
ALTER TABLE "SponsorOrder" ADD COLUMN     "user_id" TEXT;

-- AddForeignKey
ALTER TABLE "SponsorOrder" ADD CONSTRAINT "SponsorOrder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
