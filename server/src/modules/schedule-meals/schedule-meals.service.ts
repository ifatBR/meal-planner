import { PrismaClient } from '@prisma/client';
import type { UpdateScheduleMealBody } from '@app/types/schedule-meals';
import {
  getScheduleMealWithContext,
  updateScheduleMeal as updateScheduleMealRepo,
  clearScheduleMealRecipes as clearScheduleMealRecipesRepo,
} from './schedule-meals.repository';
import { getLayoutById } from '../layouts/layouts.repository';
import { getRecipesByIds } from '../recipes/recipes.repository';
import { notFoundError, ruleViolationError } from '../../utils/errors';

type DishAllocation = { dish_type_id: string; amount: number };
type MealSlot = { meal_type_id: string; dish_allocations: DishAllocation[] };
type WeekDaysLayout = { days: number[]; meal_slots: MealSlot[] };

const getDishAllocationsForMeal = (
  weekDaysLayouts: WeekDaysLayout[],
  dayOfWeek: number,
  mealTypeId: string,
): DishAllocation[] => {
  const wdl = weekDaysLayouts.find((l) => l.days.includes(dayOfWeek));
  if (!wdl) return [];
  const slot = wdl.meal_slots.find((s) => s.meal_type_id === mealTypeId);
  return slot?.dish_allocations ?? [];
};

const assignRecipesToSlots = (
  recipeIds: string[],
  recipes: Array<{ id: string; mealTypeIds: string[]; dishTypeIds: string[] }>,
  mealTypeId: string,
  dishAllocations: DishAllocation[],
): Array<{ recipeId: string; dishTypeId: string }> => {
  const slots = dishAllocations.map((da) => ({
    dishTypeId: da.dish_type_id,
    remaining: da.amount,
  }));

  const result: Array<{ recipeId: string; dishTypeId: string }> = [];
  const ineligible: Array<{ recipeId: string; reason: string }> = [];

  for (const recipeId of recipeIds) {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      ineligible.push({ recipeId, reason: 'recipe not found in workspace' });
      continue;
    }

    if (!recipe.mealTypeIds.includes(mealTypeId)) {
      ineligible.push({ recipeId, reason: 'recipe does not support this meal type' });
      continue;
    }

    const slot = slots.find((s) => s.remaining > 0 && recipe.dishTypeIds.includes(s.dishTypeId));
    if (!slot) {
      ineligible.push({ recipeId, reason: 'no eligible dish allocation slot available' });
      continue;
    }

    slot.remaining--;
    result.push({ recipeId, dishTypeId: slot.dishTypeId });
  }

  if (ineligible.length > 0) {
    const details = ineligible.map((i) => `${i.recipeId}: ${i.reason}`).join('; ');
    throw ruleViolationError(`Ineligible recipes — ${details}`);
  }

  return result;
};

export const patchScheduleMeal = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  data: UpdateScheduleMealBody,
) => {
  const meal = await getScheduleMealWithContext(prisma, id, workspaceId);
  if (!meal) throw notFoundError('schedule meal');

  let assignedRecipes: Array<{ recipeId: string; dishTypeId: string }> | undefined;

  if (data.recipeIds !== undefined) {
    const uniqueIds = [...new Set(data.recipeIds)];
    if (uniqueIds.length !== data.recipeIds.length) {
      throw ruleViolationError('Duplicate recipeIds in request');
    }

    const dayOfWeek = new Date(meal.schedule_day.date).getDay();
    const layout = await getLayoutById(
      prisma,
      meal.schedule_day.schedule.layout_id,
      workspaceId,
    );

    const dishAllocations = layout
      ? getDishAllocationsForMeal(
          layout.week_days_layouts as WeekDaysLayout[],
          dayOfWeek,
          meal.meal_type_id,
        )
      : [];

    const rawRecipes = data.recipeIds.length > 0
      ? await getRecipesByIds(prisma, data.recipeIds, workspaceId)
      : [];

    const recipeData = rawRecipes.map((r) => ({
      id: r.id,
      mealTypeIds: r.recipe_meal_types.map((rmt) => rmt.meal_type_id),
      dishTypeIds: r.recipe_dish_types.map((rdt) => rdt.dish_type_id),
    }));

    assignedRecipes = assignRecipesToSlots(
      data.recipeIds,
      recipeData,
      meal.meal_type_id,
      dishAllocations,
    );
  }

  return updateScheduleMealRepo(prisma, id, {
    isLocked: data.isLocked,
    recipes: assignedRecipes,
  });
};

export const clearScheduleMealRecipes = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
) => {
  const meal = await getScheduleMealWithContext(prisma, id, workspaceId);
  if (!meal) throw notFoundError('schedule meal');
  return clearScheduleMealRecipesRepo(prisma, id);
};
