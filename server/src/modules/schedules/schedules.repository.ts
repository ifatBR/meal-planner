import { PrismaClient } from '@prisma/client';
import type { GeneratedDay } from './domain/schedules.algorithms';

const scheduleSelect = {
  id: true,
  name: true,
  layout_id: true,
  start_date: true,
  end_date: true,
  created_at: true,
  updated_at: true,
} as const;

const mealRecipeSelect = {
  id: true,
  recipe_id: true,
  dish_type_id: true,
  recipe: { select: { name: true } },
  dish_type: { select: { id: true, name: true } },
} as const;

const scheduleMealSelect = {
  id: true,
  meal_type_id: true,
  is_locked: true,
  is_manually_edited: true,
  meal_type: { select: { id: true, name: true } },
  meal_recipes: { select: mealRecipeSelect },
} as const;

const scheduleDaySelect = {
  id: true,
  date: true,
  schedule_meals: { select: scheduleMealSelect },
} as const;

export const getSchedules = async (
  prisma: PrismaClient,
  workspaceId: string,
  opts: { page: number; pageSize: number; search?: string },
) => {
  const { page, pageSize, search } = opts;
  const where = {
    workspace_id: workspaceId,
    ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.schedule.findMany({
      where,
      select: scheduleSelect,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.schedule.count({ where }),
  ]);
  return { items, total };
};

export const getScheduleById = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  return prisma.schedule.findFirst({
    where: { id, workspace_id: workspaceId },
    select: scheduleSelect,
  });
};

export const getOverlappingSchedules = async (
  prisma: PrismaClient,
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string,
) => {
  return prisma.schedule.findMany({
    where: {
      workspace_id: workspaceId,
      ...(excludeId && { id: { not: excludeId } }),
      start_date: { lte: endDate },
      end_date: { gte: startDate },
    },
    select: { id: true, name: true, start_date: true, end_date: true },
  });
};

export const createSchedule = async (
  prisma: PrismaClient,
  data: { name: string; layoutId: string; startDate: Date; endDate: Date },
  workspaceId: string,
) => {
  return prisma.schedule.create({
    data: {
      name: data.name,
      layout_id: data.layoutId,
      start_date: data.startDate,
      end_date: data.endDate,
      workspace_id: workspaceId,
    },
    select: scheduleSelect,
  });
};

export const updateSchedule = async (
  prisma: PrismaClient,
  id: string,
  data: { name?: string },
) => {
  return prisma.schedule.update({
    where: { id },
    data: { ...(data.name !== undefined && { name: data.name }) },
    select: scheduleSelect,
  });
};

export const deleteSchedule = async (prisma: PrismaClient, id: string) => {
  return prisma.schedule.delete({ where: { id } });
};

export const getScheduleSettings = async (prisma: PrismaClient, scheduleId: string) => {
  return prisma.generationSetting.findUnique({
    where: { schedule_id: scheduleId },
    select: {
      recipe_gap: true,
      main_ing_gap: true,
      is_allow_same_day_ing: true,
      blocked_meals: {
        select: { date: true, meal_type_id: true },
      },
    },
  });
};

export const getScheduleCalendar = async (
  prisma: PrismaClient,
  scheduleId: string,
  from: Date,
  to: Date,
) => {
  return prisma.scheduleDay.findMany({
    where: {
      schedule_id: scheduleId,
      date: { gte: from, lte: to },
    },
    select: scheduleDaySelect,
    orderBy: { date: 'asc' },
  });
};

export const getLockedMealsForSchedule = async (prisma: PrismaClient, scheduleId: string) => {
  return prisma.scheduleMeal.findMany({
    where: {
      is_locked: true,
      schedule_day: { schedule_id: scheduleId },
    },
    select: {
      meal_type_id: true,
      schedule_day: { select: { date: true } },
      meal_recipes: {
        select: {
          recipe_id: true,
          dish_type_id: true,
          recipe: {
            select: {
              recipe_ingredients: {
                where: { is_main: true },
                select: { ingredient_id: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });
};

type SaveGenerationInput = {
  scheduleId: string;
  layoutId: string;
  settings: {
    recipeGap: number;
    mainIngGap: number;
    isAllowSameDayIng: boolean;
    blockedMeals: Array<{ date: string; mealTypeIds: string[] }>;
  };
  generatedDays: GeneratedDay[];
};

export const saveGenerationResult = async (
  prisma: PrismaClient,
  input: SaveGenerationInput,
) => {
  const { scheduleId, layoutId, settings, generatedDays } = input;

  return prisma.$transaction(async (tx) => {
    // Update schedule layout_id
    await tx.schedule.update({
      where: { id: scheduleId },
      data: { layout_id: layoutId },
    });

    // Delete existing GenerationSetting (cascades to BlockedMeals)
    await tx.generationSetting.deleteMany({ where: { schedule_id: scheduleId } });

    // Create new GenerationSetting with blocked meals
    const blockedMealsData = settings.blockedMeals.flatMap((bm) =>
      bm.mealTypeIds.map((mealTypeId) => ({
        date: new Date(bm.date),
        meal_type_id: mealTypeId,
      })),
    );

    await tx.generationSetting.create({
      data: {
        schedule_id: scheduleId,
        recipe_gap: settings.recipeGap,
        main_ing_gap: settings.mainIngGap,
        is_allow_same_day_ing: settings.isAllowSameDayIng,
        blocked_meals: { create: blockedMealsData },
      },
    });

    // Delete all unlocked ScheduleMeals (cascades to their MealRecipes)
    await tx.scheduleMeal.deleteMany({
      where: {
        is_locked: false,
        schedule_day: { schedule_id: scheduleId },
      },
    });

    // Create new ScheduleDay + ScheduleMeal + MealRecipe records for non-locked meals
    for (const day of generatedDays) {
      const nonLockedMeals = day.meals.filter((m) => !m.isLocked);
      if (nonLockedMeals.length === 0) continue;

      const scheduleDay = await tx.scheduleDay.upsert({
        where: {
          schedule_id_date: { schedule_id: scheduleId, date: new Date(day.date) },
        },
        update: {},
        create: { schedule_id: scheduleId, date: new Date(day.date) },
      });

      for (const meal of nonLockedMeals) {
        const scheduleMeal = await tx.scheduleMeal.create({
          data: {
            schedule_day_id: scheduleDay.id,
            meal_type_id: meal.mealTypeId,
            is_locked: false,
            is_manually_edited: false,
          },
        });

        if (meal.recipes.length > 0) {
          await tx.mealRecipe.createMany({
            data: meal.recipes.map((r) => ({
              schedule_meal_id: scheduleMeal.id,
              recipe_id: r.recipeId,
              dish_type_id: r.dishTypeId,
            })),
          });
        }
      }
    }
  });
};
