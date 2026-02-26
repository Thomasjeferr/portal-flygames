-- CreateTable
CREATE TABLE "team_requests" (
    "id" TEXT NOT NULL,
    "team_name" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "team_requests" ADD CONSTRAINT "team_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
