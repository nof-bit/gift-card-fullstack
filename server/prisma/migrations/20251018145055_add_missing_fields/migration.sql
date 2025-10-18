-- AlterTable
ALTER TABLE "GiftCard" ADD COLUMN "owner_email" TEXT;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN "group_name" TEXT;
ALTER TABLE "Group" ADD COLUMN "owner_email" TEXT;

-- AlterTable
ALTER TABLE "SharedCard" ADD COLUMN "shared_with" TEXT;
ALTER TABLE "SharedCard" ADD COLUMN "shared_with_group_id" INTEGER;
