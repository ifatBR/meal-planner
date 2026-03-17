/*
  Warnings:

  - A unique constraint covering the columns `[meal_type_id,day_of_week,order]` on the table `meal_type_dish_constraints` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order` to the `meal_type_dish_constraints` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "meal_type_dish_constraints" ADD COLUMN     "day_of_week" INTEGER,
ADD COLUMN     "order" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "meal_type_dish_constraints_meal_type_id_day_of_week_order_key" ON "meal_type_dish_constraints"("meal_type_id", "day_of_week", "order");
