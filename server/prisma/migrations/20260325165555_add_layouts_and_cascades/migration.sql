/*
  Warnings:

  - You are about to drop the column `schedule_id` on the `week_days_layouts` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[week_days_layout_id,meal_type_id]` on the table `meal_slots` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `layout_id` to the `schedules` table without a default value. This is not possible if the table is not empty.
  - Added the required column `layout_id` to the `week_days_layouts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "blocked_meals" DROP CONSTRAINT "blocked_meals_generation_settings_id_fkey";

-- DropForeignKey
ALTER TABLE "dish_allocations" DROP CONSTRAINT "dish_allocations_meal_slot_id_fkey";

-- DropForeignKey
ALTER TABLE "generation_settings" DROP CONSTRAINT "generation_settings_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "meal_recipes" DROP CONSTRAINT "meal_recipes_schedule_meal_id_fkey";

-- DropForeignKey
ALTER TABLE "meal_slots" DROP CONSTRAINT "meal_slots_week_days_layout_id_fkey";

-- DropForeignKey
ALTER TABLE "schedule_days" DROP CONSTRAINT "schedule_days_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "schedule_meals" DROP CONSTRAINT "schedule_meals_schedule_day_id_fkey";

-- DropForeignKey
ALTER TABLE "week_days_layouts" DROP CONSTRAINT "week_days_layouts_schedule_id_fkey";

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "layout_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "week_days_layouts" DROP COLUMN "schedule_id",
ADD COLUMN     "layout_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "layouts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "layouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "layouts_workspace_id_name_key" ON "layouts"("workspace_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "meal_slots_week_days_layout_id_meal_type_id_key" ON "meal_slots"("week_days_layout_id", "meal_type_id");

-- AddForeignKey
ALTER TABLE "layouts" ADD CONSTRAINT "layouts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "week_days_layouts" ADD CONSTRAINT "week_days_layouts_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_slots" ADD CONSTRAINT "meal_slots_week_days_layout_id_fkey" FOREIGN KEY ("week_days_layout_id") REFERENCES "week_days_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_allocations" ADD CONSTRAINT "dish_allocations_meal_slot_id_fkey" FOREIGN KEY ("meal_slot_id") REFERENCES "meal_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "layouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_meals" ADD CONSTRAINT "schedule_meals_schedule_day_id_fkey" FOREIGN KEY ("schedule_day_id") REFERENCES "schedule_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_recipes" ADD CONSTRAINT "meal_recipes_schedule_meal_id_fkey" FOREIGN KEY ("schedule_meal_id") REFERENCES "schedule_meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_settings" ADD CONSTRAINT "generation_settings_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_meals" ADD CONSTRAINT "blocked_meals_generation_settings_id_fkey" FOREIGN KEY ("generation_settings_id") REFERENCES "generation_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
