import { PrismaClient } from '@prisma/client';

const mealRecipeSelect = {
  id: true,
  recipe_id: true,
  dish_type_id: true,
  recipe: { select: { name: true } },
  dish_type: { select: { id: true, name: true } },
} as const;

const scheduleMealFullSelect = {
  id: true,
  meal_type_id: true,
  is_locked: true,
  is_manually_edited: true,
  meal_type: { select: { id: true, name: true } },
  meal_recipes: { select: mealRecipeSelect },
  schedule_day: {
    select: {
      date: true,
      schedule: {
        select: {
          workspace_id: true,
          layout_id: true,
        },
      },
    },
  },
} as const;

export const getScheduleMealWithContext = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
) => {
  return prisma.scheduleMeal.findFirst({
    where: {
      id,
      schedule_day: { schedule: { workspace_id: workspaceId } },
    },
    select: scheduleMealFullSelect,
  });
};

const scheduleMealResultSelect = {
  id: true,
  meal_type_id: true,
  is_locked: true,
  is_manually_edited: true,
  meal_type: { select: { id: true, name: true } },
  meal_recipes: { select: mealRecipeSelect },
} as const;

export const updateScheduleMeal = async (
  prisma: PrismaClient,
  id: string,
  data: {
    isLocked?: boolean;
    recipes?: Array<{ recipeId: string; dishTypeId: string }>;
  },
) => {
  return prisma.$transaction(async (tx) => {
    if (data.recipes !== undefined) {
      await tx.mealRecipe.deleteMany({ where: { schedule_meal_id: id } });
    }

    return tx.scheduleMeal.update({
      where: { id },
      data: {
        ...(data.isLocked !== undefined && { is_locked: data.isLocked }),
        ...(data.recipes !== undefined && {
          is_manually_edited: true,
          meal_recipes: {
            create: data.recipes.map((r) => ({
              recipe_id: r.recipeId,
              dish_type_id: r.dishTypeId,
            })),
          },
        }),
      },
      select: scheduleMealResultSelect,
    });
  });
};

export const clearScheduleMealRecipes = async (prisma: PrismaClient, id: string) => {
  return prisma.$transaction(async (tx) => {
    await tx.mealRecipe.deleteMany({ where: { schedule_meal_id: id } });
    return tx.scheduleMeal.update({
      where: { id },
      data: { is_locked: false, is_manually_edited: true },
      select: scheduleMealResultSelect,
    });
  });
};
