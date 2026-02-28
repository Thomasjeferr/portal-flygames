-- AlterTable
ALTER TABLE "tournament_teams" ADD COLUMN IF NOT EXISTS "goal_payout_percent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "team_tournament_goal_earnings" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "tournament_subscription_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "payment_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_tournament_goal_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TeamWithdrawalGoalItem" (
    "id" TEXT NOT NULL,
    "withdrawal_id" TEXT NOT NULL,
    "earning_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,

    CONSTRAINT "TeamWithdrawalGoalItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_tournament_goal_earnings_team_id_fkey') THEN
        ALTER TABLE "team_tournament_goal_earnings" ADD CONSTRAINT "team_tournament_goal_earnings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_tournament_goal_earnings_tournament_subscription_id_fkey') THEN
        ALTER TABLE "team_tournament_goal_earnings" ADD CONSTRAINT "team_tournament_goal_earnings_tournament_subscription_id_fkey" FOREIGN KEY ("tournament_subscription_id") REFERENCES "tournament_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamWithdrawalGoalItem_withdrawal_id_fkey') THEN
        ALTER TABLE "TeamWithdrawalGoalItem" ADD CONSTRAINT "TeamWithdrawalGoalItem_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "TeamWithdrawal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamWithdrawalGoalItem_earning_id_fkey') THEN
        ALTER TABLE "TeamWithdrawalGoalItem" ADD CONSTRAINT "TeamWithdrawalGoalItem_earning_id_fkey" FOREIGN KEY ("earning_id") REFERENCES "team_tournament_goal_earnings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
