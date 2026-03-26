import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  getScheduleMealWithContext,
  updateScheduleMeal,
  clearScheduleMealRecipes,
} from '../schedule-meals.repository';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const WS_ID =     '00000000-0000-0000-0007-000000000001';
const MT_ID =     '00000000-0000-0000-0007-000000000002';
const DT_ID =     '00000000-0000-0000-0007-000000000003';
const LAYOUT_ID = '00000000-0000-0000-0007-000000000004';
const SCHED_ID =  '00000000-0000-0000-0007-000000000005';
const RECIPE_ID = '00000000-0000-0000-0007-000000000006';

beforeAll(async () => {
  await prisma.workspace.upsert({
    where: { id: WS_ID },
    update: {},
    create: { id: WS_ID, name: 'Schedule Meals Test Workspace' },
  });
  await prisma.mealType.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Meal Type' } },
    update: {},
    create: { id: MT_ID, name: 'Test Meal Type', workspace_id: WS_ID },
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
  await prisma.schedule.upsert({
    where: { id: SCHED_ID },
    update: {},
    create: {
      id: SCHED_ID,
      name: 'Test Schedule',
      workspace_id: WS_ID,
      layout_id: LAYOUT_ID,
      start_date: new Date('2026-03-01'),
      end_date: new Date('2026-04-01'),
    },
  });
  await prisma.recipe.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Recipe' } },
    update: {},
    create: {
      id: RECIPE_ID,
      name: 'Test Recipe',
      workspace_id: WS_ID,
    },
  });
});

beforeEach(async () => {
  await prisma.scheduleDay.deleteMany({ where: { schedule_id: SCHED_ID } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const createTestMeal = async (opts: { isLocked?: boolean; withRecipe?: boolean } = {}) => {
  const day = await prisma.scheduleDay.create({
    data: { schedule_id: SCHED_ID, date: new Date('2026-03-05') },
  });
  const meal = await prisma.scheduleMeal.create({
    data: {
      schedule_day_id: day.id,
      meal_type_id: MT_ID,
      is_locked: opts.isLocked ?? false,
    },
  });
  if (opts.withRecipe) {
    await prisma.mealRecipe.create({
      data: { schedule_meal_id: meal.id, recipe_id: RECIPE_ID, dish_type_id: DT_ID },
    });
  }
  return meal;
};

describe('getScheduleMealWithContext', () => {
  it('returns meal with full context when found', async () => {
    const meal = await createTestMeal();
    const result = await getScheduleMealWithContext(prisma, meal.id, WS_ID);
    expect(result?.id).toBe(meal.id);
    expect(result?.meal_type.name).toBe('Test Meal Type');
    expect(result?.schedule_day.schedule.workspace_id).toBe(WS_ID);
    expect(result?.schedule_day.schedule.layout_id).toBe(LAYOUT_ID);
  });

  it('returns null for non-existent meal', async () => {
    const result = await getScheduleMealWithContext(prisma, '00000000-0000-0000-0000-999999999999', WS_ID);
    expect(result).toBeNull();
  });

  it('returns null when meal belongs to a different workspace', async () => {
    const meal = await createTestMeal();
    const result = await getScheduleMealWithContext(prisma, meal.id, '00000000-0000-0000-0000-999999999999');
    expect(result).toBeNull();
  });
});

describe('updateScheduleMeal', () => {
  it('updates isLocked without touching recipes', async () => {
    const meal = await createTestMeal({ withRecipe: true });
    const result = await updateScheduleMeal(prisma, meal.id, { isLocked: true });
    expect(result.is_locked).toBe(true);
    expect(result.meal_recipes).toHaveLength(1);
  });

  it('replaces recipes when recipes array provided', async () => {
    const meal = await createTestMeal({ withRecipe: true });
    const result = await updateScheduleMeal(prisma, meal.id, {
      recipes: [{ recipeId: RECIPE_ID, dishTypeId: DT_ID }],
    });
    expect(result.meal_recipes).toHaveLength(1);
    expect(result.meal_recipes[0].recipe_id).toBe(RECIPE_ID);
    expect(result.is_manually_edited).toBe(true);
  });

  it('clears all recipes when empty recipes array provided', async () => {
    const meal = await createTestMeal({ withRecipe: true });
    const result = await updateScheduleMeal(prisma, meal.id, { recipes: [] });
    expect(result.meal_recipes).toHaveLength(0);
    expect(result.is_manually_edited).toBe(true);
  });

  it('updates both isLocked and recipes together', async () => {
    const meal = await createTestMeal();
    const result = await updateScheduleMeal(prisma, meal.id, {
      isLocked: true,
      recipes: [{ recipeId: RECIPE_ID, dishTypeId: DT_ID }],
    });
    expect(result.is_locked).toBe(true);
    expect(result.meal_recipes).toHaveLength(1);
    expect(result.is_manually_edited).toBe(true);
  });
});

describe('clearScheduleMealRecipes', () => {
  it('deletes all recipes and sets isManuallyEdited=true', async () => {
    const meal = await createTestMeal({ withRecipe: true });
    const result = await clearScheduleMealRecipes(prisma, meal.id);
    expect(result.meal_recipes).toHaveLength(0);
    expect(result.is_manually_edited).toBe(true);
  });

  it('sets isLocked=false', async () => {
    const meal = await createTestMeal({ isLocked: true, withRecipe: true });
    const result = await clearScheduleMealRecipes(prisma, meal.id);
    expect(result.is_locked).toBe(false);
  });
});
