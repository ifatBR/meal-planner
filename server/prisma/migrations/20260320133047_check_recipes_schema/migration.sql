/*
  Warnings:

  - You are about to drop the column `dish_type_id` on the `recipes` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_recipe_id_fkey";

-- DropForeignKey
ALTER TABLE "recipe_meal_types" DROP CONSTRAINT "recipe_meal_types_recipe_id_fkey";

-- DropForeignKey
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_dish_type_id_fkey";

-- AlterTable
ALTER TABLE "recipes" DROP COLUMN "dish_type_id";

-- CreateTable
CREATE TABLE "recipe_dish_types" (
    "recipe_id" UUID NOT NULL,
    "dish_type_id" UUID NOT NULL,

    CONSTRAINT "recipe_dish_types_pkey" PRIMARY KEY ("recipe_id","dish_type_id")
);

-- AddForeignKey
ALTER TABLE "recipe_meal_types" ADD CONSTRAINT "recipe_meal_types_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_dish_types" ADD CONSTRAINT "recipe_dish_types_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_dish_types" ADD CONSTRAINT "recipe_dish_types_dish_type_id_fkey" FOREIGN KEY ("dish_type_id") REFERENCES "dish_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
