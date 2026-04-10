/*
  Warnings:

  - A unique constraint covering the columns `[meal_slot_id,order]` on the table `dish_allocations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order` to the `dish_allocations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "dish_allocations" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
UPDATE "dish_allocations" da
SET "order" = sub.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY meal_slot_id ORDER BY id) as row_num
  FROM "dish_allocations"
) sub
WHERE da.id = sub.id;

CREATE UNIQUE INDEX "dish_allocations_meal_slot_id_order_key" ON "dish_allocations"("meal_slot_id", "order");
