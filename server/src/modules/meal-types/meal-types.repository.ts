import { PrismaClient } from '@prisma/client';

const mealTypeSelect = { select: { id: true, name: true } };

export const listMealTypes = async (prisma: PrismaClient, workspaceId: string) => {
  return prisma.mealType.findMany({
    where: { workspace_id: workspaceId },
    ...mealTypeSelect,
    orderBy: { name: 'asc' },
  });
};

export const getMealTypeById = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
) => {
  return prisma.mealType.findFirst({
    where: { id, workspace_id: workspaceId },
    ...mealTypeSelect,
  });
};

export const createMealType = async (
  prisma: PrismaClient,
  data: { name: string },
  workspaceId: string,
) => {
  return prisma.mealType.create({
    data: { name: data.name, workspace_id: workspaceId },
    ...mealTypeSelect,
  });
};

export const updateMealType = async (
  prisma: PrismaClient,
  id: string,
  data: { name: string },
) => {
  return prisma.mealType.update({
    where: { id },
    data: { name: data.name },
    ...mealTypeSelect,
  });
};

export const deleteMealType = async (prisma: PrismaClient, id: string) => {
  return prisma.mealType.delete({ where: { id } });
};

export const countMealTypeReferences = async (prisma: PrismaClient, id: string) => {
  const [recipeMealTypeCount, scheduleMealCount, mealSlotCount] = await Promise.all([
    prisma.recipeMealType.count({ where: { meal_type_id: id } }),
    prisma.scheduleMeal.count({ where: { meal_type_id: id } }),
    prisma.mealSlot.count({ where: { meal_type_id: id } }),
  ]);
  return { recipeMealTypeCount, scheduleMealCount, mealSlotCount };
};
