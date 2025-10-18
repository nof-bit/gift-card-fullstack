/*
  Warnings:

  - You are about to drop the column `created_at` on the `ArchivedCard` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `GiftCard` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `GiftCard` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Group` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `SharedCard` table. All the data in the column will be lost.
  - Added the required column `updated_date` to the `GiftCard` table without a default value. This is not possible if the table is not empty.

*/
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
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ArchivedCard" ("archived_date", "card_name", "created_by", "data", "id", "original_card_id", "shared_with_email", "shared_with_group_id") SELECT "archived_date", "card_name", "created_by", "data", "id", "original_card_id", "shared_with_email", "shared_with_group_id" FROM "ArchivedCard";
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
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL
);
INSERT INTO "new_GiftCard" ("balance", "card_name", "card_type", "created_by", "expiry_date", "id", "is_archived", "vendor") SELECT "balance", "card_name", "card_type", "created_by", "expiry_date", "id", "is_archived", "vendor" FROM "GiftCard";
DROP TABLE "GiftCard";
ALTER TABLE "new_GiftCard" RENAME TO "GiftCard";
CREATE TABLE "new_Group" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "members" TEXT,
    "created_by" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Group" ("created_by", "id", "members", "name") SELECT "created_by", "id", "members", "name" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
CREATE TABLE "new_Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "card_id" INTEGER,
    "card_name" TEXT,
    "recipient_email" TEXT,
    "notification_type" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "data" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Notification" ("card_id", "card_name", "data", "id", "is_dismissed", "is_read", "notification_type", "recipient_email") SELECT "card_id", "card_name", "data", "id", "is_dismissed", "is_read", "notification_type", "recipient_email" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
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
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SharedCard" ("balance", "card_id", "card_name", "card_type", "created_by", "data", "expiry_date", "group_id", "id", "user_email", "vendor") SELECT "balance", "card_id", "card_name", "card_type", "created_by", "data", "expiry_date", "group_id", "id", "user_email", "vendor" FROM "SharedCard";
DROP TABLE "SharedCard";
ALTER TABLE "new_SharedCard" RENAME TO "SharedCard";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
