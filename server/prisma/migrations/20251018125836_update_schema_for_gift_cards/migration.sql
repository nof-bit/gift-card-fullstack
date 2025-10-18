/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ArchivedCard` table. All the data in the column will be lost.
  - You are about to drop the column `balance_amount` on the `GiftCard` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `GiftCard` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `GiftCard` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SharedCard` table. All the data in the column will be lost.
  - You are about to drop the column `createdByOwnerEmail` on the `SharedCard` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `GiftCard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "user_email" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ArchivedCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "original_card_id" INTEGER,
    "card_name" TEXT,
    "shared_with_email" TEXT,
    "shared_with_group_id" INTEGER,
    "created_by" TEXT,
    "data" TEXT,
    "archived_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ArchivedCard" ("card_name", "data", "id", "original_card_id", "shared_with_email", "shared_with_group_id") SELECT "card_name", "data", "id", "original_card_id", "shared_with_email", "shared_with_group_id" FROM "ArchivedCard";
DROP TABLE "ArchivedCard";
ALTER TABLE "new_ArchivedCard" RENAME TO "ArchivedCard";
CREATE TABLE "new_GiftCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "card_name" TEXT NOT NULL,
    "vendor" TEXT,
    "balance" INTEGER,
    "expiry_date" DATETIME,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "card_type" TEXT,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_GiftCard" ("card_name", "card_type", "expiry_date", "id", "is_archived", "vendor") SELECT "card_name", "card_type", "expiry_date", "id", "is_archived", "vendor" FROM "GiftCard";
DROP TABLE "GiftCard";
ALTER TABLE "new_GiftCard" RENAME TO "GiftCard";
CREATE TABLE "new_Group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "members" TEXT,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Group" ("id", "members", "name") SELECT "id", "members", "name" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
CREATE TABLE "new_SharedCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "card_id" INTEGER NOT NULL,
    "user_email" TEXT,
    "group_id" INTEGER,
    "created_by" TEXT,
    "balance" INTEGER,
    "card_name" TEXT,
    "vendor" TEXT,
    "expiry_date" DATETIME,
    "card_type" TEXT,
    "data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SharedCard" ("card_id", "data", "group_id", "id", "user_email") SELECT "card_id", "data", "group_id", "id", "user_email" FROM "SharedCard";
DROP TABLE "SharedCard";
ALTER TABLE "new_SharedCard" RENAME TO "SharedCard";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
