/*
  Warnings:

  - Added the required column `color` to the `meal_types` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dish_allocations" ALTER COLUMN "order" DROP DEFAULT;

-- AlterTable
ALTER TABLE "meal_types" ADD COLUMN     "color" TEXT NOT NULL  DEFAULT '#AEE553';
