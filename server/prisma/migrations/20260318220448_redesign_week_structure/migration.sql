/*
  Warnings:

  - You are about to drop the `meal_type_dish_constraints` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "meal_type_dish_constraints" DROP CONSTRAINT "meal_type_dish_constraints_dish_type_id_fkey";

-- DropForeignKey
ALTER TABLE "meal_type_dish_constraints" DROP CONSTRAINT "meal_type_dish_constraints_meal_type_id_fkey";

-- DropTable
DROP TABLE "meal_type_dish_constraints";

-- CreateTable
CREATE TABLE "week_days_layouts" (
    "id" UUID NOT NULL,
    "days" INTEGER[],
    "schedule_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "week_days_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_slots" (
    "id" UUID NOT NULL,
    "week_days_layout_id" UUID NOT NULL,
    "meal_type_id" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "meal_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dish_allocations" (
    "id" UUID NOT NULL,
    "meal_slot_id" UUID NOT NULL,
    "dish_type_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "dish_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_slots_week_days_layout_id_order_key" ON "meal_slots"("week_days_layout_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "dish_allocations_meal_slot_id_dish_type_id_key" ON "dish_allocations"("meal_slot_id", "dish_type_id");

-- AddForeignKey
ALTER TABLE "week_days_layouts" ADD CONSTRAINT "week_days_layouts_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_slots" ADD CONSTRAINT "meal_slots_week_days_layout_id_fkey" FOREIGN KEY ("week_days_layout_id") REFERENCES "week_days_layouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_slots" ADD CONSTRAINT "meal_slots_meal_type_id_fkey" FOREIGN KEY ("meal_type_id") REFERENCES "meal_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_allocations" ADD CONSTRAINT "dish_allocations_meal_slot_id_fkey" FOREIGN KEY ("meal_slot_id") REFERENCES "meal_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dish_allocations" ADD CONSTRAINT "dish_allocations_dish_type_id_fkey" FOREIGN KEY ("dish_type_id") REFERENCES "dish_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
