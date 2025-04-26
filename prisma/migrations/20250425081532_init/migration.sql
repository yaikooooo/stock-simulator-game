-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uniqueId" TEXT NOT NULL DEFAULT 'TEMP-PLACEHOLDER',
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "createdAt", "id", "nickname", "uniqueId", "updatedAt") SELECT "avatar", "createdAt", "id", "nickname", "uniqueId", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_uniqueId_key" ON "User"("uniqueId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
