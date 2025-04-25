/*
  Warnings:

  - Added the required column `phone` to the `AuthBinding` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuthBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bindingType" TEXT NOT NULL DEFAULT 'auth',
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthBinding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AuthBinding" ("bindingType", "createdAt", "externalId", "id", "metadata", "provider", "userId") SELECT "bindingType", "createdAt", "externalId", "id", "metadata", "provider", "userId" FROM "AuthBinding";
DROP TABLE "AuthBinding";
ALTER TABLE "new_AuthBinding" RENAME TO "AuthBinding";
CREATE UNIQUE INDEX "AuthBinding_provider_externalId_key" ON "AuthBinding"("provider", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
