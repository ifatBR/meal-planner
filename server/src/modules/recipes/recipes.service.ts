import { PrismaClient } from '@prisma/client';
import type { AffectedSchedule } from '@app/types/common';
import type { CreateRecipeBody, UpdateRecipeBody } from '@app/types/recipes';
import {
  getRecipes as getRecipesRepo,
  getRecipeById,
  createRecipe as createRecipeRepo,
  updateRecipe as updateRecipeRepo,
  deleteRecipe as deleteRecipeRepo,
  cloneRecipe as cloneRecipeRepo,
  getRecipeMealRecipes,
  getUnitsByNames,
} from './recipes.repository';
import { getDishTypesByIds } from '../dish-types/dish-types.repository';
import { getMealTypesByIds } from '../meal-types/meal-types.repository';
import { getIngredientsByIds, getVariantsByIds } from '../ingredients/ingredients.repository';
import { validateExactlyOneMain } from './domain/recipes.rules';
import {
  notFoundError,
  invalidRequestError,
  ruleViolationError,
  conflictError,
  isP2002,
  ScheduleConflictError,
} from '../../utils/errors';

type MealRecipeRow = Awaited<ReturnType<typeof getRecipeMealRecipes>>[number];

const groupBySchedule = (rows: MealRecipeRow[]): AffectedSchedule[] => {
  const map = new Map<string, AffectedSchedule>();
  for (const row of rows) {
    const { id: scheduleId, name: scheduleName } = row.schedule_meal.schedule_day.schedule;
    const date = row.schedule_meal.schedule_day.date.toISOString().split('T')[0];
    if (!map.has(scheduleId)) {
      map.set(scheduleId, { scheduleId, scheduleName, dates: [] });
    }
    const entry = map.get(scheduleId)!;
    if (!entry.dates.includes(date)) entry.dates.push(date);
  }
  return Array.from(map.values());
};

const resolveIngredients = async (
  prisma: PrismaClient,
  ingredients: CreateRecipeBody['ingredients'],
  workspaceId: string,
) => {
  const ingredientIds = ingredients.map((i) => i.id);
  const foundIngredients = await getIngredientsByIds(prisma, ingredientIds, workspaceId);
  if (foundIngredients.length !== ingredientIds.length) throw invalidRequestError('ingredients');

  const variantIds = ingredients.filter((i) => i.variantId).map((i) => i.variantId as string);
  const foundVariants =
    variantIds.length > 0 ? await getVariantsByIds(prisma, variantIds, workspaceId) : [];

  const unitNames = [...new Set(ingredients.filter((i) => i.measure).map((i) => i.measure!.unit))];
  const foundUnits = unitNames.length > 0 ? await getUnitsByNames(prisma, unitNames) : [];
  if (foundUnits.length !== unitNames.length) throw invalidRequestError('unit');
  const unitMap = new Map(foundUnits.map((u) => [u.name, u.id]));

  return ingredients.map((ing) => {
    let displayName: string | null = null;
    if (ing.variantId) {
      const variant = foundVariants.find(
        (v) => v.id === ing.variantId && v.ingredient_id === ing.id,
      );
      if (!variant) throw invalidRequestError('variantId');
      displayName = variant.variant;
    }
    return {
      ingredientId: ing.id,
      displayName,
      isMain: ing.isMain,
      amount: ing.measure?.amount,
      unitId: ing.measure ? unitMap.get(ing.measure.unit) : undefined,
    };
  });
};

export const listRecipes = async (
  prisma: PrismaClient,
  workspaceId: string,
  opts: {
    page: number;
    pageSize: number;
    search?: string;
    dishTypeId?: string;
    mealTypeId?: string;
    ingredientId?: string;
  },
) => {
  const { items, total } = await getRecipesRepo(prisma, workspaceId, opts);
  return {
    items,
    meta: {
      page: opts.page,
      pageSize: opts.pageSize,
      total,
      totalPages: Math.ceil(total / opts.pageSize),
    },
  };
};

export const fetchRecipeById = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  const recipe = await getRecipeById(prisma, id, workspaceId);
  if (!recipe) throw notFoundError('recipe');
  return recipe;
};

export const createRecipe = async (
  prisma: PrismaClient,
  workspaceId: string,
  data: CreateRecipeBody,
) => {
  if (!validateExactlyOneMain(data.ingredients.map((i) => ({ isMain: i.isMain })))) {
    throw ruleViolationError('Recipe must have exactly one main ingredient');
  }

  const [foundDishTypes, foundMealTypes] = await Promise.all([
    getDishTypesByIds(prisma, data.dishTypeIds, workspaceId),
    getMealTypesByIds(prisma, data.mealTypeIds, workspaceId),
  ]);
  if (foundDishTypes.length !== data.dishTypeIds.length) throw invalidRequestError('dishTypeIds');
  if (foundMealTypes.length !== data.mealTypeIds.length) throw invalidRequestError('mealTypeIds');

  const resolvedIngredients = await resolveIngredients(prisma, data.ingredients, workspaceId);

  try {
    return await createRecipeRepo(
      prisma,
      {
        name: data.name.trim().toLowerCase(),
        instructions: data.instructions,
        dishTypeIds: data.dishTypeIds,
        mealTypeIds: data.mealTypeIds,
        ingredients: resolvedIngredients,
      },
      workspaceId,
    );
  } catch (err) {
    if (isP2002(err)) throw conflictError('recipe');
    throw err;
  }
};

export const updateRecipe = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  data: UpdateRecipeBody,
) => {
  const recipe = await getRecipeById(prisma, id, workspaceId);
  if (!recipe) throw notFoundError('recipe');

  if (data.ingredients !== undefined) {
    if (!validateExactlyOneMain(data.ingredients.map((i) => ({ isMain: i.isMain })))) {
      throw ruleViolationError('Recipe must have exactly one main ingredient');
    }
  }

  if (data.dishTypeIds) {
    const found = await getDishTypesByIds(prisma, data.dishTypeIds, workspaceId);
    if (found.length !== data.dishTypeIds.length) throw invalidRequestError('dishTypeIds');
  }
  if (data.mealTypeIds) {
    const found = await getMealTypesByIds(prisma, data.mealTypeIds, workspaceId);
    if (found.length !== data.mealTypeIds.length) throw invalidRequestError('mealTypeIds');
  }

  if (data.dishTypeIds !== undefined || data.mealTypeIds !== undefined) {
    const mealRecipes = await getRecipeMealRecipes(prisma, id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = mealRecipes.filter(
      (mr) => new Date(mr.schedule_meal.schedule_day.date) >= today,
    );

    if (data.dishTypeIds !== undefined) {
      const newSet = new Set(data.dishTypeIds);
      const conflicts = future.filter((mr) => !newSet.has(mr.dish_type_id));
      if (conflicts.length > 0) {
        throw new ScheduleConflictError(
          'recipe_dish_type_conflict',
          'This recipe is assigned to future schedule meals with dish types that no longer match.',
          groupBySchedule(conflicts),
        );
      }
    }

    if (data.mealTypeIds !== undefined) {
      const newSet = new Set(data.mealTypeIds);
      const conflicts = future.filter((mr) => !newSet.has(mr.schedule_meal.meal_type_id));
      if (conflicts.length > 0) {
        throw new ScheduleConflictError(
          'recipe_meal_type_conflict',
          'This recipe is assigned to future schedule meals with meal types that no longer match.',
          groupBySchedule(conflicts),
        );
      }
    }
  }

  const resolvedIngredients = data.ingredients
    ? await resolveIngredients(prisma, data.ingredients, workspaceId)
    : undefined;

  try {
    return await updateRecipeRepo(prisma, id, {
      name: data.name?.trim()?.toLowerCase(),
      instructions: data.instructions,
      dishTypeIds: data.dishTypeIds,
      mealTypeIds: data.mealTypeIds,
      ingredients: resolvedIngredients,
    });
  } catch (err) {
    if (isP2002(err)) throw conflictError('recipe');
    throw err;
  }
};

export const cloneRecipeById = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  name: string,
) => {
  try {
    const result = await cloneRecipeRepo(prisma, id, workspaceId, name);
    if (!result) throw notFoundError('recipe');
    return result;
  } catch (err) {
    if (isP2002(err)) throw conflictError('recipe');
    throw err;
  }
};

export const deleteRecipe = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  const recipe = await getRecipeById(prisma, id, workspaceId);
  if (!recipe) throw notFoundError('recipe');

  const mealRecipes = await getRecipeMealRecipes(prisma, id);
  if (mealRecipes.length > 0) {
    throw new ScheduleConflictError(
      'recipe_in_use',
      'This recipe is used in active schedules and cannot be deleted.',
      groupBySchedule(mealRecipes),
    );
  }

  await deleteRecipeRepo(prisma, id);
  return { success: true as const };
};
