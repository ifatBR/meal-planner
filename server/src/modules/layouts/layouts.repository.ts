import { PrismaClient } from '@prisma/client';

export const getLayoutById = async (prisma: PrismaClient, layoutId: string) => {
  return prisma.weekDaysLayout.findFirst({
    where: { id: layoutId },
    select: {
      id: true,
      days: true,
      schedule_id: true,
      schedule: { select: { workspace_id: true } },
    },
  });
};

export const getMealSlotsByLayoutId = async (prisma: PrismaClient, layoutId: string) => {
  return prisma.mealSlot.findMany({
    where: { week_days_layout_id: layoutId },
    select: { id: true, order: true, meal_type_id: true },
    orderBy: { order: 'asc' },
  });
};

export const reorderMealSlots = async (
  prisma: PrismaClient,
  updates: Array<{ id: string; order: number }>,
) => {
  return prisma.$transaction([
    // first pass: set to temp values to avoid conflicts
    ...updates.map(({ id }, i) =>
      prisma.mealSlot.update({ where: { id }, data: { order: -(i + 1) } }),
    ),
    ...updates.map(({ id, order }) => prisma.mealSlot.update({ where: { id }, data: { order } })),
  ]);
};
