import { PrismaClient } from '@prisma/client';

const recipeSelect = {
  id: true,
  name: true,
  instructions: true,
  recipe_dish_types: {
    select: { dish_type: { select: { id: true, name: true } } },
  },
  recipe_meal_types: {
    select: { meal_type: { select: { id: true, name: true } } },
  },
  recipe_ingredients: {
    select: {
      id: true,
      is_main: true,
      display_name: true,
      amount: true,
      ingredient: { select: { id: true, name: true } },
      unit: { select: { name: true } },
    },
  },
} as const;

type RecipeIngredientData = {
  ingredientId: string;
  displayName: string | null;
  isMain: boolean;
  amount?: number;
  unitId?: string;
};

type GetRecipesOpts = {
  page: number;
  pageSize: number;
  search?: string;
  dishTypeId?: string;
  mealTypeId?: string;
  ingredientId?: string;
};

type CreateRecipeData = {
  name: string;
  instructions?: string;
  dishTypeIds: string[];
  mealTypeIds: string[];
  ingredients: RecipeIngredientData[];
};

type UpdateRecipeData = {
  name?: string;
  instructions?: string | null;
  dishTypeIds?: string[];
  mealTypeIds?: string[];
  ingredients?: RecipeIngredientData[];
};

export const getRecipes = async (
  prisma: PrismaClient,
  workspaceId: string,
  opts: GetRecipesOpts,
) => {
  const { page, pageSize, search, dishTypeId, mealTypeId, ingredientId } = opts;
  const where = {
    workspace_id: workspaceId,
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    ...(dishTypeId && { recipe_dish_types: { some: { dish_type_id: dishTypeId } } }),
    ...(mealTypeId && { recipe_meal_types: { some: { meal_type_id: mealTypeId } } }),
    ...(ingredientId && { recipe_ingredients: { some: { ingredient_id: ingredientId } } }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.recipe.findMany({
      where,
      select: recipeSelect,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recipe.count({ where }),
  ]);
  return { items, total };
};

export const getRecipeById = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  return prisma.recipe.findFirst({
    where: { id, workspace_id: workspaceId },
    select: recipeSelect,
  });
};

export const createRecipe = async (
  prisma: PrismaClient,
  data: CreateRecipeData,
  workspaceId: string,
) => {
  return prisma.recipe.create({
    data: {
      name: data.name,
      instructions: data.instructions,
      workspace_id: workspaceId,
      recipe_dish_types: {
        create: data.dishTypeIds.map((id) => ({ dish_type_id: id })),
      },
      recipe_meal_types: {
        create: data.mealTypeIds.map((id) => ({ meal_type_id: id })),
      },
      recipe_ingredients: {
        create: data.ingredients.map((ing) => ({
          ingredient_id: ing.ingredientId,
          display_name: ing.displayName,
          is_main: ing.isMain,
          amount: ing.amount ?? null,
          unit_id: ing.unitId ?? null,
        })),
      },
    },
    select: recipeSelect,
  });
};

export const updateRecipe = async (prisma: PrismaClient, id: string, data: UpdateRecipeData) => {
  return prisma.$transaction(async (tx) => {
    if (data.dishTypeIds) {
      await tx.recipeDishType.deleteMany({ where: { recipe_id: id } });
    }
    if (data.mealTypeIds) {
      await tx.recipeMealType.deleteMany({ where: { recipe_id: id } });
    }
    if (data.ingredients) {
      await tx.recipeIngredient.deleteMany({ where: { recipe_id: id } });
    }
    return tx.recipe.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.instructions !== undefined && { instructions: data.instructions }),
        ...(data.dishTypeIds && {
          recipe_dish_types: {
            create: data.dishTypeIds.map((dtId) => ({ dish_type_id: dtId })),
          },
        }),
        ...(data.mealTypeIds && {
          recipe_meal_types: {
            create: data.mealTypeIds.map((mtId) => ({ meal_type_id: mtId })),
          },
        }),
        ...(data.ingredients && {
          recipe_ingredients: {
            create: data.ingredients.map((ing) => ({
              ingredient_id: ing.ingredientId,
              display_name: ing.displayName,
              is_main: ing.isMain,
              amount: ing.amount ?? null,
              unit_id: ing.unitId ?? null,
            })),
          },
        }),
      },
      select: recipeSelect,
    });
  });
};

export const deleteRecipe = async (prisma: PrismaClient, id: string) => {
  return prisma.recipe.delete({ where: { id } });
};

export const getRecipeMealRecipes = async (prisma: PrismaClient, recipeId: string) => {
  return prisma.mealRecipe.findMany({
    where: { recipe_id: recipeId },
    select: {
      dish_type_id: true,
      schedule_meal: {
        select: {
          meal_type_id: true,
          schedule_day: {
            select: {
              date: true,
              schedule: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });
};

export const getUnitsByNames = async (prisma: PrismaClient, names: string[]) => {
  return prisma.unit.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });
};
