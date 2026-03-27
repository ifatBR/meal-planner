import { PrismaClient } from '@prisma/client';
import type {
  CreateScheduleBody,
  UpdateScheduleBody,
  GenerateScheduleBody,
} from '@app/types/schedules';
import {
  getSchedules as getSchedulesRepo,
  getScheduleById,
  getOverlappingSchedules,
  createSchedule as createScheduleRepo,
  updateSchedule as updateScheduleRepo,
  deleteSchedule as deleteScheduleRepo,
  getScheduleSettings as getScheduleSettingsRepo,
  getScheduleCalendar as getScheduleCalendarRepo,
  getLockedMealsForSchedule,
  saveGenerationResult,
} from './schedules.repository';
import { getLayoutById } from '../layouts/layouts.repository';
import { getRecipesForGeneration } from '../recipes/recipes.repository';
import { validateScheduleDateRange } from './domain/schedules.rules';
import {
  generateSchedule,
  type RecipeForGeneration,
  type LockedMealForGeneration,
} from './domain/schedules.algorithms';
import {
  notFoundError,
  conflictError,
  ruleViolationError,
  invalidRequestError,
  isP2002,
} from '../../utils/errors';
import { formatDate, parseDate } from '../../utils/date';

export const listSchedules = async (
  prisma: PrismaClient,
  workspaceId: string,
  opts: { page: number; pageSize: number; search?: string },
) => {
  const { items, total } = await getSchedulesRepo(prisma, workspaceId, opts);
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

export const fetchScheduleById = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  const schedule = await getScheduleById(prisma, id, workspaceId);
  if (!schedule) throw notFoundError('schedule');
  return schedule;
};

export const createSchedule = async (
  prisma: PrismaClient,
  workspaceId: string,
  data: CreateScheduleBody,
) => {
  const startDate = parseDate(data.startDate);
  const endDate = parseDate(data.endDate);

  const rangeCheck = validateScheduleDateRange(startDate, endDate);
  if (!rangeCheck.valid) throw ruleViolationError(rangeCheck.reason);

  const layout = await getLayoutById(prisma, data.layoutId, workspaceId);
  if (!layout) throw invalidRequestError('layoutId');

  const overlapping = await getOverlappingSchedules(prisma, workspaceId, startDate, endDate);
  if (overlapping.length > 0) throw conflictError('schedule for this range');

  try {
    return await createScheduleRepo(
      prisma,
      { name: data.name, layoutId: data.layoutId, startDate, endDate },
      workspaceId,
    );
  } catch (err) {
    if (isP2002(err)) throw conflictError('schedule');
    throw err;
  }
};

export const updateSchedule = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  data: UpdateScheduleBody,
) => {
  const schedule = await getScheduleById(prisma, id, workspaceId);
  if (!schedule) throw notFoundError('schedule');

  try {
    return await updateScheduleRepo(prisma, id, { name: data.name });
  } catch (err) {
    if (isP2002(err)) throw conflictError('schedule name');
    throw err;
  }
};

export const deleteSchedule = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  const schedule = await getScheduleById(prisma, id, workspaceId);
  if (!schedule) throw notFoundError('schedule');
  await deleteScheduleRepo(prisma, id);
  return { success: true as const };
};

export const fetchScheduleSettings = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
) => {
  const schedule = await getScheduleById(prisma, id, workspaceId);
  if (!schedule) throw notFoundError('schedule');

  const settings = await getScheduleSettingsRepo(prisma, id);
  if (!settings) throw notFoundError('settings');
  return settings;
};

export const fetchScheduleCalendar = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  anchorDate: string,
) => {
  const schedule = await getScheduleById(prisma, id, workspaceId);
  if (!schedule) throw notFoundError('schedule');

  const anchor = parseDate(anchorDate);
  const scheduleStart = schedule.start_date;
  const scheduleEnd = schedule.end_date;

  if (anchor < scheduleStart || anchor > scheduleEnd) {
    throw invalidRequestError('anchorDate');
  }

  const windowStart = new Date(anchor);
  windowStart.setUTCDate(windowStart.getUTCDate() - 7);
  const windowEnd = new Date(anchor);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 13);

  const from = new Date(Math.max(windowStart.getTime(), scheduleStart.getTime()));
  const to = new Date(Math.min(windowEnd.getTime(), scheduleEnd.getTime()));

  const scheduleDays = await getScheduleCalendarRepo(prisma, id, from, to);
  const dayMap = new Map(scheduleDays.map((d) => [formatDate(d.date), d]));

  const days = [];
  const current = new Date(from);
  while (current <= to) {
    const dateStr = formatDate(current);
    const existing = dayMap.get(dateStr);
    days.push({
      id: existing?.id ?? null,
      date: dateStr,
      meals: existing?.schedule_meals ?? [],
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return { scheduleId: id, anchorDate, days };
};

export const generateScheduleService = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  data: GenerateScheduleBody,
) => {
  const schedule = await getScheduleById(prisma, id, workspaceId);
  if (!schedule) throw notFoundError('schedule');

  const scheduleStart = schedule.start_date;
  const scheduleEnd = schedule.end_date;

  const blockedMeals = data.settings.blockedMeals ?? [];
  for (const bm of blockedMeals) {
    const bmDate = parseDate(bm.date);
    if (bmDate < scheduleStart || bmDate > scheduleEnd) {
      throw invalidRequestError('blockedMeals');
    }
  }

  const layout = await getLayoutById(prisma, data.layoutId, workspaceId);
  if (!layout) throw invalidRequestError('layoutId');

  const [rawRecipes, rawLockedMeals] = await Promise.all([
    getRecipesForGeneration(prisma, workspaceId),
    getLockedMealsForSchedule(prisma, id),
  ]);

  const recipes: RecipeForGeneration[] = rawRecipes.map((r) => ({
    id: r.id,
    mealTypeIds: r.recipe_meal_types.map((rmt) => rmt.meal_type_id),
    dishTypeIds: r.recipe_dish_types.map((rdt) => rdt.dish_type_id),
    mainIngredientId: r.recipe_ingredients[0]?.ingredient_id ?? null,
  }));

  const lockedMeals: LockedMealForGeneration[] = rawLockedMeals.map((lm) => ({
    date: formatDate(lm.schedule_day.date),
    mealTypeId: lm.meal_type_id,
    recipeIds: lm.meal_recipes.map((mr) => mr.recipe_id),
    mainIngredientIds: lm.meal_recipes
      .map((mr) => mr.recipe.recipe_ingredients[0]?.ingredient_id)
      .filter((ingId): ingId is string => ingId !== undefined),
    recipes: lm.meal_recipes.map((mr) => ({
      recipeId: mr.recipe_id,
      dishTypeId: mr.dish_type_id,
    })),
  }));

  const algorithmOutput = generateSchedule({
    startDate: scheduleStart,
    endDate: scheduleEnd,
    weekDaysLayouts: layout.week_days_layouts.map((wdl) => ({
      days: wdl.days,
      mealSlots: wdl.meal_slots.map((slot) => ({
        mealTypeId: slot.meal_type.id,
        dishAllocations: slot.dish_allocations.map((da) => ({
          dishTypeId: da.dish_type.id,
          amount: da.amount,
        })),
      })),
    })),
    settings: {
      recipeGap: data.settings.recipeGap,
      mainIngGap: data.settings.mainIngGap,
      isAllowSameDayIng: data.settings.isAllowSameDayIng,
      blockedMeals,
    },
    recipes,
    lockedMeals,
  });

  await saveGenerationResult(prisma, {
    scheduleId: id,
    layoutId: data.layoutId,
    settings: {
      recipeGap: data.settings.recipeGap,
      mainIngGap: data.settings.mainIngGap,
      isAllowSameDayIng: data.settings.isAllowSameDayIng,
      blockedMeals,
    },
    generatedDays: algorithmOutput.days,
  });

  const updatedSchedule = await getScheduleById(prisma, id, workspaceId);

  // Calendar window: startDate to min(startDate+13, endDate)
  const windowEnd = new Date(scheduleStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 13);
  const calendarEnd = new Date(Math.min(windowEnd.getTime(), scheduleEnd.getTime()));

  const calendarDays = await getScheduleCalendarRepo(prisma, id, scheduleStart, calendarEnd);
  const dayMap = new Map(calendarDays.map((d) => [formatDate(d.date), d]));

  const calendarDaysList = [];
  const cur = new Date(scheduleStart);
  while (cur <= calendarEnd) {
    const dateStr = formatDate(cur);
    const existing = dayMap.get(dateStr);
    calendarDaysList.push({
      id: existing?.id ?? null,
      date: dateStr,
      meals: existing?.schedule_meals ?? [],
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return {
    schedule: updatedSchedule!,
    settings: {
      recipeGap: data.settings.recipeGap,
      mainIngGap: data.settings.mainIngGap,
      isAllowSameDayIng: data.settings.isAllowSameDayIng,
      blockedMeals,
    },
    calendar: {
      anchorDate: formatDate(scheduleStart),
      days: calendarDaysList,
    },
    generationSummary: algorithmOutput.summary,
    warnings: algorithmOutput.warnings,
  };
};
