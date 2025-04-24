/*
  Warnings:

  - You are about to drop the column `balance` on the `Account` table. All the data in the column will be lost.
  - Added the required column `balanceCNY` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `balanceEUR` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `balanceUSD` to the `Account` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "balanceCNY" REAL NOT NULL,
    "balanceUSD" REAL NOT NULL,
    "balanceEUR" REAL NOT NULL,
    "totalValue" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("id", "totalValue", "updatedAt", "userId") SELECT "id", "totalValue", "updatedAt", "userId" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Holding_userId_code_key" ON "Holding"("userId", "code");
