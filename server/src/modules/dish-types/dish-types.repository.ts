import { PrismaClient } from '@prisma/client';

const dishTypeSelect = { select: { id: true, name: true } };

export const listDishTypes = async (prisma: PrismaClient, workspaceId: string) => {
  return prisma.dishType.findMany({
    where: { workspace_id: workspaceId },
    ...dishTypeSelect,
    orderBy: { name: 'asc' },
  });
};

export const getDishTypeById = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
) => {
  return prisma.dishType.findFirst({
    where: { id, workspace_id: workspaceId },
    ...dishTypeSelect,
  });
};

export const createDishType = async (
  prisma: PrismaClient,
  data: { name: string },
  workspaceId: string,
) => {
  return prisma.dishType.create({
    data: { name: data.name, workspace_id: workspaceId },
    ...dishTypeSelect,
  });
};

export const updateDishType = async (
  prisma: PrismaClient,
  id: string,
  data: { name: string },
) => {
  return prisma.dishType.update({
    where: { id },
    data: { name: data.name },
    ...dishTypeSelect,
  });
};

export const deleteDishType = async (prisma: PrismaClient, id: string) => {
  return prisma.dishType.delete({ where: { id } });
};

export const countDishTypeReferences = async (prisma: PrismaClient, id: string) => {
  const [recipeCount, constraintCount] = await Promise.all([
    prisma.recipe.count({ where: { dish_type_id: id } }),
    prisma.mealTypeDishConstraint.count({ where: { dish_type_id: id } }),
  ]);
  return { recipeCount, constraintCount };
};
