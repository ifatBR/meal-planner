/*
  Warnings:

  - The primary key for the `blocked_meals` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `dish_types` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `generation_settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ingredient_aliases` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ingredients` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `meal_recipes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `meal_type_dish_constraints` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `meal_types` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `recipe_ingredients` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `unit_id` column on the `recipe_ingredients` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `recipe_meal_types` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `recipes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `refresh_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `roles_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `schedule_days` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `schedule_meals` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `schedules` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `units` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `workspace_users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `workspaces` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `blocked_meals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `generation_settings_id` on the `blocked_meals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `meal_type_id` on the `blocked_meals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `dish_types` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `workspace_id` on the `dish_types` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `generation_settings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `schedule_id` on the `generation_settings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `ingredient_aliases` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ingredient_id` on the `ingredient_aliases` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `workspace_id` on the `ingredient_aliases` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `ingredients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `workspace_id` on the `ingredients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `meal_recipes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `schedule_meal_id` on the `meal_recipes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `recipe_id` on the `meal_recipes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `dish_type_id` on the `meal_recipes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `meal_type_dish_constraints` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `meal_type_id` on the `meal_type_dish_constraints` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `dish_type_id` on the `meal_type_dish_constraints` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `meal_types` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `workspace_id` on the `meal_types` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `recipe_ingredients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `recipe_id` on the `recipe_ingredients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ingredient_id` on the `recipe_ingredients` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `recipe_id` on the `recipe_meal_types` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `meal_type_id` on the `recipe_meal_types` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `recipes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `dish_type_id` on the `recipes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `workspace_id` on the `recipes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `refresh_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `refresh_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `roles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role_id` on the `roles_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `permission_id` on the `roles_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `schedule_days` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `schedule_id` on the `schedule_days` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `schedule_meals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `schedule_day_id` on the `schedule_meals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `meal_type_id` on the `schedule_meals` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `schedules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `workspace_id` on the `schedules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `units` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `workspace_users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `workspace_id` on the `workspace_users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role_id` on the `workspace_users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `workspaces` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "blocked_meals" DROP CONSTRAINT "blocked_meals_generation_settings_id_fkey";

-- DropForeignKey
ALTER TABLE "blocked_meals" DROP CONSTRAINT "blocked_meals_meal_type_id_fkey";

-- DropForeignKey
ALTER TABLE "dish_types" DROP CONSTRAINT "dish_types_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "generation_settings" DROP CONSTRAINT "generation_settings_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "ingredient_aliases" DROP CONSTRAINT "ingredient_aliases_ingredient_id_fkey";

-- DropForeignKey
ALTER TABLE "ingredient_aliases" DROP CONSTRAINT "ingredient_aliases_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "meal_recipes" DROP CONSTRAINT "meal_recipes_dish_type_id_fkey";

-- DropForeignKey
ALTER TABLE "meal_recipes" DROP CONSTRAINT "meal_recipes_recipe_id_fkey";

-- DropForeignKey
ALTER TABLE "meal_recipes" DROP CONSTRAINT "meal_recipes_schedule_meal_id_fkey";

-- DropForeignKey
ALTER TABLE "meal_type_dish_constraints" DROP CONSTRAINT "meal_type_dish_constraints_dish_type_id_fkey";

-- DropForeignKey
ALTER TABLE "meal_type_dish_constraints" DROP CONSTRAINT "meal_type_dish_constraints_meal_type_id_fkey";

-- DropForeignKey
ALTER TABLE "meal_types" DROP CONSTRAINT "meal_types_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_ingredient_id_fkey";

-- DropForeignKey
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_recipe_id_fkey";

-- DropForeignKey
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "recipe_meal_types" DROP CONSTRAINT "recipe_meal_types_meal_type_id_fkey";

-- DropForeignKey
ALTER TABLE "recipe_meal_types" DROP CONSTRAINT "recipe_meal_types_recipe_id_fkey";

-- DropForeignKey
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_dish_type_id_fkey";

-- DropForeignKey
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "roles_permissions" DROP CONSTRAINT "roles_permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "roles_permissions" DROP CONSTRAINT "roles_permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "schedule_days" DROP CONSTRAINT "schedule_days_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "schedule_meals" DROP CONSTRAINT "schedule_meals_meal_type_id_fkey";

-- DropForeignKey
ALTER TABLE "schedule_meals" DROP CONSTRAINT "schedule_meals_schedule_day_id_fkey";

-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "workspace_users" DROP CONSTRAINT "workspace_users_role_id_fkey";

-- DropForeignKey
ALTER TABLE "workspace_users" DROP CONSTRAINT "workspace_users_user_id_fkey";

-- DropForeignKey
ALTER TABLE "workspace_users" DROP CONSTRAINT "workspace_users_workspace_id_fkey";

-- AlterTable
ALTER TABLE "blocked_meals" DROP CONSTRAINT "blocked_meals_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "generation_settings_id",
ADD COLUMN     "generation_settings_id" UUID NOT NULL,
DROP COLUMN "meal_type_id",
ADD COLUMN     "meal_type_id" UUID NOT NULL,
ADD CONSTRAINT "blocked_meals_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "dish_types" DROP CONSTRAINT "dish_types_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "workspace_id",
ADD COLUMN     "workspace_id" UUID NOT NULL,
ADD CONSTRAINT "dish_types_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "generation_settings" DROP CONSTRAINT "generation_settings_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "schedule_id",
ADD COLUMN     "schedule_id" UUID NOT NULL,
ADD CONSTRAINT "generation_settings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ingredient_aliases" DROP CONSTRAINT "ingredient_aliases_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "ingredient_id",
ADD COLUMN     "ingredient_id" UUID NOT NULL,
DROP COLUMN "workspace_id",
ADD COLUMN     "workspace_id" UUID NOT NULL,
ADD CONSTRAINT "ingredient_aliases_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "workspace_id",
ADD COLUMN     "workspace_id" UUID NOT NULL,
ADD CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "meal_recipes" DROP CONSTRAINT "meal_recipes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "schedule_meal_id",
ADD COLUMN     "schedule_meal_id" UUID NOT NULL,
DROP COLUMN "recipe_id",
ADD COLUMN     "recipe_id" UUID NOT NULL,
DROP COLUMN "dish_type_id",
ADD COLUMN     "dish_type_id" UUID NOT NULL,
ADD CONSTRAINT "meal_recipes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "meal_type_dish_constraints" DROP CONSTRAINT "meal_type_dish_constraints_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "meal_type_id",
ADD COLUMN     "meal_type_id" UUID NOT NULL,
DROP COLUMN "dish_type_id",
ADD COLUMN     "dish_type_id" UUID NOT NULL,
ADD CONSTRAINT "meal_type_dish_constraints_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "meal_types" DROP CONSTRAINT "meal_types_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "workspace_id",
ADD COLUMN     "workspace_id" UUID NOT NULL,
ADD CONSTRAINT "meal_types_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "recipe_id",
ADD COLUMN     "recipe_id" UUID NOT NULL,
DROP COLUMN "ingredient_id",
ADD COLUMN     "ingredient_id" UUID NOT NULL,
DROP COLUMN "unit_id",
ADD COLUMN     "unit_id" UUID,
ADD CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "recipe_meal_types" DROP CONSTRAINT "recipe_meal_types_pkey",
DROP COLUMN "recipe_id",
ADD COLUMN     "recipe_id" UUID NOT NULL,
DROP COLUMN "meal_type_id",
ADD COLUMN     "meal_type_id" UUID NOT NULL,
ADD CONSTRAINT "recipe_meal_types_pkey" PRIMARY KEY ("recipe_id", "meal_type_id");

-- AlterTable
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "dish_type_id",
ADD COLUMN     "dish_type_id" UUID NOT NULL,
DROP COLUMN "workspace_id",
ADD COLUMN     "workspace_id" UUID NOT NULL,
ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "roles" DROP CONSTRAINT "roles_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "roles_permissions" DROP CONSTRAINT "roles_permissions_pkey",
DROP COLUMN "role_id",
ADD COLUMN     "role_id" UUID NOT NULL,
DROP COLUMN "permission_id",
ADD COLUMN     "permission_id" UUID NOT NULL,
ADD CONSTRAINT "roles_permissions_pkey" PRIMARY KEY ("role_id", "permission_id");

-- AlterTable
ALTER TABLE "schedule_days" DROP CONSTRAINT "schedule_days_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "schedule_id",
ADD COLUMN     "schedule_id" UUID NOT NULL,
ADD CONSTRAINT "schedule_days_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "schedule_meals" DROP CONSTRAINT "schedule_meals_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "schedule_day_id",
ADD COLUMN     "schedule_day_id" UUID NOT NULL,
DROP COLUMN "meal_type_id",
ADD COLUMN     "meal_type_id" UUID NOT NULL,
ADD CONSTRAINT "schedule_meals_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
DROP COLUMN "workspace_id",
ADD COLUMN     "workspace_id" UUID NOT NULL,
ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "units" DROP CONSTRAINT "units_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "workspace_users" DROP CONSTRAINT "workspace_users_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
DROP COLUMN "workspace_id",
ADD COLUMN     "workspace_id" UUID NOT NULL,
DROP COLUMN "role_id",
ADD COLUMN     "role_id" UUID NOT NULL,
ADD CONSTRAINT "workspace_users_pkey" PRIMARY KEY ("user_id", "workspace_id");

-- AlterTable
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_meals_generation_settings_id_date_meal_type_id_key" ON "blocked_meals"("generation_settings_id", "date", "meal_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "dish_types_workspace_id_name_key" ON "dish_types"("workspace_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "generation_settings_schedule_id_key" ON "generation_settings"("schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_aliases_workspace_id_alias_key" ON "ingredient_aliases"("workspace_id", "alias");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_workspace_id_name_key" ON "ingredients"("workspace_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "meal_recipes_schedule_meal_id_recipe_id_key" ON "meal_recipes"("schedule_meal_id", "recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_type_dish_constraints_meal_type_id_dish_type_id_key" ON "meal_type_dish_constraints"("meal_type_id", "dish_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_types_workspace_id_name_key" ON "meal_types"("workspace_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipe_id_ingredient_id_key" ON "recipe_ingredients"("recipe_id", "ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_workspace_id_name_key" ON "recipes"("workspace_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_days_schedule_id_date_key" ON "schedule_days"("schedule_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_meals_schedule_day_id_meal_type_id_key" ON "schedule_meals"("schedule_day_id", "meal_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedules_workspace_id_name_key" ON "schedules"("workspace_id", "name");

-- AddForeignKey
ALTER TABLE "roles_permissions" ADD CONSTRAINT "roles_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permissions" ADD CONSTRAINT "roles_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_users" ADD CONSTRAINT "workspace_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_types" ADD CONSTRAINT "meal_types_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_type_dish_constraints" ADD CONSTRAINT "meal_type_dish_constraints_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_type_dish_constraints" ADD CONSTRAINT "meal_type_dish_constraints_dish_type_id_fkey" FOREIGN KEY ("dish_type_id") REFERENCES "dish_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_types" ADD CONSTRAINT "dish_types_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_dish_type_id_fkey" FOREIGN KEY ("dish_type_id") REFERENCES "dish_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_meal_types" ADD CONSTRAINT "recipe_meal_types_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_meal_types" ADD CONSTRAINT "recipe_meal_types_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_aliases" ADD CONSTRAINT "ingredient_aliases_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_aliases" ADD CONSTRAINT "ingredient_aliases_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_meals" ADD CONSTRAINT "schedule_meals_schedule_day_id_fkey" FOREIGN KEY ("schedule_day_id") REFERENCES "schedule_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_meals" ADD CONSTRAINT "schedule_meals_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_recipes" ADD CONSTRAINT "meal_recipes_schedule_meal_id_fkey" FOREIGN KEY ("schedule_meal_id") REFERENCES "schedule_meals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_recipes" ADD CONSTRAINT "meal_recipes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_recipes" ADD CONSTRAINT "meal_recipes_dish_type_id_fkey" FOREIGN KEY ("dish_type_id") REFERENCES "dish_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_settings" ADD CONSTRAINT "generation_settings_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_meals" ADD CONSTRAINT "blocked_meals_generation_settings_id_fkey" FOREIGN KEY ("generation_settings_id") REFERENCES "generation_settings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_meals" ADD CONSTRAINT "blocked_meals_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
