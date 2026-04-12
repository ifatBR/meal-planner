import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  getSchedules,
  getScheduleById,
  getOverlappingSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getScheduleSettings,
  getScheduleCalendar,
  getLockedMealsForSchedule,
  saveGenerationResult,
} from '../schedules.repository';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const WS_ID = '00000000-0000-0000-0006-000000000001';
const MT_ID = '00000000-0000-0000-0006-000000000002';
const DT_ID = '00000000-0000-0000-0006-000000000003';
const LAYOUT_ID = '00000000-0000-0000-0006-000000000004';
const SCHED_ID = '00000000-0000-0000-0006-000000000005';
const ING_ID = '00000000-0000-0000-0006-000000000006';
const RECIPE_ID = '00000000-0000-0000-0006-000000000007';
const MT_COLOR = '#AEE553';

beforeAll(async () => {
  await prisma.workspace.upsert({
    where: { id: WS_ID },
    update: {},
    create: { id: WS_ID, name: 'Schedules Test Workspace' },
  });
  await prisma.mealType.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Meal Type' } },
    update: {},
    create: { id: MT_ID, name: 'Test Meal Type', workspace_id: WS_ID, color: MT_COLOR },
  });
  await prisma.dishType.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Dish Type' } },
    update: {},
    create: { id: DT_ID, name: 'Test Dish Type', workspace_id: WS_ID },
  });
  await prisma.layout.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Layout' } },
    update: {},
    create: { id: LAYOUT_ID, name: 'Test Layout', workspace_id: WS_ID },
  });
  await prisma.ingredient.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Ingredient' } },
    update: {},
    create: { id: ING_ID, name: 'Test Ingredient', workspace_id: WS_ID },
  });
  await prisma.recipe.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Recipe' } },
    update: {},
    create: {
      id: RECIPE_ID,
      name: 'Test Recipe',
      workspace_id: WS_ID,
      recipe_meal_types: { create: { meal_type_id: MT_ID } },
      recipe_dish_types: { create: { dish_type_id: DT_ID } },
      recipe_ingredients: { create: { ingredient_id: ING_ID, is_main: true } },
    },
  });
});

beforeEach(async () => {
  await prisma.schedule.deleteMany({ where: { workspace_id: WS_ID } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('getSchedules', () => {
  it('returns paginated schedules for the workspace', async () => {
    await prisma.schedule.createMany({
      data: [
        {
          name: 'Schedule A',
          workspace_id: WS_ID,
          layout_id: LAYOUT_ID,
          start_date: new Date('2026-01-01'),
          end_date: new Date('2026-02-01'),
        },
        {
          name: 'Schedule B',
          workspace_id: WS_ID,
          layout_id: LAYOUT_ID,
          start_date: new Date('2026-02-01'),
          end_date: new Date('2026-03-01'),
        },
      ],
    });
    const result = await getSchedules(prisma, WS_ID, { page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('returns empty when workspace has no schedules', async () => {
    const result = await getSchedules(prisma, WS_ID, { page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('applies pagination correctly', async () => {
    await prisma.schedule.createMany({
      data: [
        {
          name: 'Schedule A',
          workspace_id: WS_ID,
          layout_id: LAYOUT_ID,
          start_date: new Date('2026-01-01'),
          end_date: new Date('2026-02-01'),
        },
        {
          name: 'Schedule B',
          workspace_id: WS_ID,
          layout_id: LAYOUT_ID,
          start_date: new Date('2026-02-01'),
          end_date: new Date('2026-03-01'),
        },
        {
          name: 'Schedule C',
          workspace_id: WS_ID,
          layout_id: LAYOUT_ID,
          start_date: new Date('2026-03-01'),
          end_date: new Date('2026-04-01'),
        },
      ],
    });
    const result = await getSchedules(prisma, WS_ID, { page: 2, pageSize: 2 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(3);
  });

  it('filters by search term', async () => {
    await prisma.schedule.createMany({
      data: [
        {
          name: 'Alpha Schedule',
          workspace_id: WS_ID,
          layout_id: LAYOUT_ID,
          start_date: new Date('2026-01-01'),
          end_date: new Date('2026-02-01'),
        },
        {
          name: 'Beta Schedule',
          workspace_id: WS_ID,
          layout_id: LAYOUT_ID,
          start_date: new Date('2026-02-01'),
          end_date: new Date('2026-03-01'),
        },
      ],
    });
    const result = await getSchedules(prisma, WS_ID, { page: 1, pageSize: 20, search: 'alpha' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Alpha Schedule');
  });

  it('does not return schedules from other workspaces', async () => {
    await prisma.schedule.create({
      data: {
        name: 'Schedule A',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-02-01'),
      },
    });
    const result = await getSchedules(prisma, '00000000-0000-0000-0000-999999999999', {
      page: 1,
      pageSize: 20,
    });
    expect(result.items).toHaveLength(0);
  });
});

describe('getScheduleById', () => {
  it('returns schedule when found', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    const result = await getScheduleById(prisma, SCHED_ID, WS_ID);
    expect(result?.id).toBe(SCHED_ID);
    expect(result?.name).toBe('Test');
  });

  it('returns null for non-existent schedule', async () => {
    const result = await getScheduleById(prisma, '00000000-0000-0000-0000-999999999999', WS_ID);
    expect(result).toBeNull();
  });

  it('returns null when schedule belongs to a different workspace', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    const result = await getScheduleById(prisma, SCHED_ID, '00000000-0000-0000-0000-999999999999');
    expect(result).toBeNull();
  });
});

describe('getOverlappingSchedules', () => {
  it('returns overlapping schedules', async () => {
    await prisma.schedule.create({
      data: {
        name: 'Existing',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    const result = await getOverlappingSchedules(
      prisma,
      WS_ID,
      new Date('2026-03-15'),
      new Date('2026-05-01'),
    );
    expect(result).toHaveLength(1);
  });

  it('returns empty when no overlap', async () => {
    await prisma.schedule.create({
      data: {
        name: 'Existing',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    const result = await getOverlappingSchedules(
      prisma,
      WS_ID,
      new Date('2026-05-01'),
      new Date('2026-06-01'),
    );
    expect(result).toHaveLength(0);
  });

  it('excludes the schedule with excludeId', async () => {
    const sched = await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Existing',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    const result = await getOverlappingSchedules(
      prisma,
      WS_ID,
      new Date('2026-03-15'),
      new Date('2026-05-01'),
      sched.id,
    );
    expect(result).toHaveLength(0);
  });
});

describe('createSchedule', () => {
  it('creates a schedule with correct fields', async () => {
    const result = await createSchedule(
      prisma,
      {
        name: 'New',
        layoutId: LAYOUT_ID,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-04-01'),
      },
      WS_ID,
    );
    expect(result.name).toBe('New');
    expect(result.layout_id).toBe(LAYOUT_ID);
  });
});

describe('updateSchedule', () => {
  it('updates the schedule name', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Original',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    const result = await updateSchedule(prisma, SCHED_ID, { name: 'Renamed' });
    expect(result.name).toBe('Renamed');
  });
});

describe('deleteSchedule', () => {
  it('deletes the schedule', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'To Delete',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    await deleteSchedule(prisma, SCHED_ID);
    const result = await getScheduleById(prisma, SCHED_ID, WS_ID);
    expect(result).toBeNull();
  });
});

describe('getScheduleSettings', () => {
  it('returns null when no settings saved', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    const result = await getScheduleSettings(prisma, SCHED_ID);
    expect(result).toBeNull();
  });

  it('returns settings with blocked meals when saved', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    await prisma.generationSetting.create({
      data: {
        schedule_id: SCHED_ID,
        recipe_gap: 3,
        main_ing_gap: 7,
        is_allow_same_day_ing: false,
        blocked_meals: { create: [{ date: new Date('2026-03-05'), meal_type_id: MT_ID }] },
      },
    });
    const result = await getScheduleSettings(prisma, SCHED_ID);
    expect(result?.recipe_gap).toBe(3);
    expect(result?.main_ing_gap).toBe(7);
    expect(result?.blocked_meals).toHaveLength(1);
  });
});

describe('getScheduleCalendar', () => {
  it('returns schedule days within range', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    await prisma.scheduleDay.create({
      data: { schedule_id: SCHED_ID, date: new Date('2026-03-05') },
    });
    const result = await getScheduleCalendar(
      prisma,
      SCHED_ID,
      new Date('2026-03-01'),
      new Date('2026-03-31'),
    );
    expect(result).toHaveLength(1);
    expect(result[0].date.toISOString().split('T')[0]).toBe('2026-03-05');
  });

  it('returns empty when no days in range', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    const result = await getScheduleCalendar(
      prisma,
      SCHED_ID,
      new Date('2026-03-01'),
      new Date('2026-03-31'),
    );
    expect(result).toHaveLength(0);
  });
});

describe('getLockedMealsForSchedule', () => {
  it('returns locked meals with their recipes and main ingredient', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    const day = await prisma.scheduleDay.create({
      data: { schedule_id: SCHED_ID, date: new Date('2026-03-05') },
    });
    const meal = await prisma.scheduleMeal.create({
      data: { schedule_day_id: day.id, meal_type_id: MT_ID, is_locked: true },
    });
    await prisma.mealRecipe.create({
      data: { schedule_meal_id: meal.id, recipe_id: RECIPE_ID, dish_type_id: DT_ID },
    });

    const result = await getLockedMealsForSchedule(prisma, SCHED_ID);
    expect(result).toHaveLength(1);
    expect(result[0].meal_type_id).toBe(MT_ID);
    expect(result[0].meal_recipes).toHaveLength(1);
    expect(result[0].meal_recipes[0].recipe_id).toBe(RECIPE_ID);
    expect(result[0].meal_recipes[0].recipe.recipe_ingredients[0]?.ingredient_id).toBe(ING_ID);
  });

  it('does not return unlocked meals', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });
    const day = await prisma.scheduleDay.create({
      data: { schedule_id: SCHED_ID, date: new Date('2026-03-05') },
    });
    await prisma.scheduleMeal.create({
      data: { schedule_day_id: day.id, meal_type_id: MT_ID, is_locked: false },
    });

    const result = await getLockedMealsForSchedule(prisma, SCHED_ID);
    expect(result).toHaveLength(0);
  });
});

describe('saveGenerationResult', () => {
  it('creates generation settings and schedule days with meals', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });

    await saveGenerationResult(prisma, {
      scheduleId: SCHED_ID,
      layoutId: LAYOUT_ID,
      settings: {
        recipeGap: 3,
        mainIngGap: 7,
        isAllowSameDayIng: false,
        blockedMeals: [],
      },
      generatedDays: [
        {
          date: '2026-03-01',
          meals: [
            {
              mealTypeId: MT_ID,
              recipes: [{ recipeId: RECIPE_ID, dishTypeId: DT_ID }],
              isLocked: false,
            },
          ],
        },
      ],
    });

    const settings = await getScheduleSettings(prisma, SCHED_ID);
    expect(settings?.recipe_gap).toBe(3);

    const days = await getScheduleCalendar(
      prisma,
      SCHED_ID,
      new Date('2026-03-01'),
      new Date('2026-04-01'),
    );
    expect(days).toHaveLength(1);
    expect(days[0].schedule_meals).toHaveLength(1);
    expect(days[0].schedule_meals[0].meal_recipes).toHaveLength(1);
  });

  it('replaces settings on re-generation', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });

    await saveGenerationResult(prisma, {
      scheduleId: SCHED_ID,
      layoutId: LAYOUT_ID,
      settings: { recipeGap: 3, mainIngGap: 7, isAllowSameDayIng: false, blockedMeals: [] },
      generatedDays: [
        { date: '2026-03-01', meals: [{ mealTypeId: MT_ID, recipes: [], isLocked: false }] },
      ],
    });

    await saveGenerationResult(prisma, {
      scheduleId: SCHED_ID,
      layoutId: LAYOUT_ID,
      settings: { recipeGap: 5, mainIngGap: 14, isAllowSameDayIng: true, blockedMeals: [] },
      generatedDays: [],
    });

    const settings = await getScheduleSettings(prisma, SCHED_ID);
    expect(settings?.recipe_gap).toBe(5);
    expect(settings?.main_ing_gap).toBe(14);
  });

  it('does not delete locked meals on re-generation', async () => {
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test',
        workspace_id: WS_ID,
        layout_id: LAYOUT_ID,
        start_date: new Date('2026-03-01'),
        end_date: new Date('2026-04-01'),
      },
    });

    // Create a locked meal manually
    const day = await prisma.scheduleDay.create({
      data: { schedule_id: SCHED_ID, date: new Date('2026-03-02') },
    });
    await prisma.scheduleMeal.create({
      data: { schedule_day_id: day.id, meal_type_id: MT_ID, is_locked: true },
    });

    // Run generation — should not delete the locked meal
    await saveGenerationResult(prisma, {
      scheduleId: SCHED_ID,
      layoutId: LAYOUT_ID,
      settings: { recipeGap: 3, mainIngGap: 7, isAllowSameDayIng: false, blockedMeals: [] },
      generatedDays: [],
    });

    const lockedMeals = await getLockedMealsForSchedule(prisma, SCHED_ID);
    expect(lockedMeals).toHaveLength(1);
  });
});
