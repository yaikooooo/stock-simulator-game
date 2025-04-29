-- CreateTable
CREATE TABLE "battle_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stockCode" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "betAmount" REAL NOT NULL,
    "startPrice" REAL NOT NULL,
    "holdMinutes" INTEGER NOT NULL,
    "settleTime" DATETIME NOT NULL,
    "endPrice" REAL,
    "settlementResult" TEXT,
    "profitAmount" REAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "battle_orders_userId_idx" ON "battle_orders"("userId");

-- CreateIndex
CREATE INDEX "battle_orders_status_settleTime_idx" ON "battle_orders"("status", "settleTime");
