import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipeMealRecipes,
} from '../recipes.repository';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const WS_ID = '00000000-0000-0000-0005-000000000001';
const DT_ID = '00000000-0000-0000-0005-000000000002';
const MT_ID = '00000000-0000-0000-0005-000000000003';
const ING_ID = '00000000-0000-0000-0005-000000000004';
const SCHED_ID = '00000000-0000-0000-0005-000000000005';
const LAYOUT_ID = '00000000-0000-0000-0005-000000000006';
const UNIT_NAME = 'grams-test';

let unitId: string;

beforeAll(async () => {
  await prisma.workspace.upsert({
    where: { id: WS_ID },
    update: {},
    create: { id: WS_ID, name: 'Test Workspace' },
  });
  const dt = await prisma.dishType.upsert({
    where: { id: DT_ID },
    update: {},
    create: { id: DT_ID, name: 'Main Course Test', workspace_id: WS_ID },
  });
  const mt = await prisma.mealType.upsert({
    where: { id: MT_ID },
    update: {},
    create: { id: MT_ID, name: 'Lunch Test', workspace_id: WS_ID },
  });
  const ing = await prisma.ingredient.upsert({
    where: { id: ING_ID },
    update: {},
    create: { id: ING_ID, name: 'Chicken Test', workspace_id: WS_ID },
  });
  const unit = await prisma.unit.upsert({
    where: { name: UNIT_NAME },
    update: {},
    create: { name: UNIT_NAME },
  });
  unitId = unit.id;
  await prisma.layout.upsert({
    where: { id: LAYOUT_ID },
    update: {},
    create: { id: LAYOUT_ID, name: 'Test Layout', workspace_id: WS_ID },
  });
  await prisma.schedule.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Schedule' } },
    update: {},
    create: {
      id: SCHED_ID,
      name: 'Test Schedule',
      workspace_id: WS_ID,
      layout_id: LAYOUT_ID,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-12-31'),
    },
  });
});

beforeEach(async () => {
  await prisma.mealRecipe.deleteMany({
    where: { recipe: { workspace_id: WS_ID } },
  });
  await prisma.scheduleMeal.deleteMany({
    where: { schedule_day: { schedule_id: SCHED_ID } },
  });
  await prisma.scheduleDay.deleteMany({ where: { schedule_id: SCHED_ID } });
  await prisma.recipe.deleteMany({ where: { workspace_id: WS_ID } });
  await prisma.ingredient.deleteMany({
    where: { workspace_id: WS_ID, id: { not: ING_ID } },
  });
  await prisma.dishType.deleteMany({
    where: { workspace_id: WS_ID, id: { not: DT_ID } },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const makeRecipeData = () => ({
  name: 'Test Recipe',
  dishTypeIds: [DT_ID],
  mealTypeIds: [MT_ID],
  ingredients: [{ ingredientId: ING_ID, displayName: null, isMain: true }],
});

describe('createRecipe', () => {
  it('creates a recipe with all relations', async () => {
    const result = await createRecipe(prisma, makeRecipeData(), WS_ID);
    expect(result.name).toBe('Test Recipe');
    expect(result.recipe_dish_types).toHaveLength(1);
    expect(result.recipe_meal_types).toHaveLength(1);
    expect(result.recipe_ingredients).toHaveLength(1);
    expect(result.recipe_ingredients[0].is_main).toBe(true);
    expect(result.recipe_ingredients[0].display_name).toBeNull();
  });

  it('stores display_name and amount when provided', async () => {
    const result = await createRecipe(
      prisma,
      {
        ...makeRecipeData(),
        ingredients: [
          {
            ingredientId: ING_ID,
            displayName: 'Grilled Chicken',
            isMain: true,
            amount: 200,
            unitId,
          },
        ],
      },
      WS_ID,
    );
    expect(result.recipe_ingredients[0].display_name).toBe('Grilled Chicken');
    expect(result.recipe_ingredients[0].amount).toBe(200);
    expect(result.recipe_ingredients[0].unit?.name).toBe(UNIT_NAME);
  });
});

describe('getRecipeById', () => {
  it('returns recipe scoped to workspace', async () => {
    const created = await createRecipe(prisma, makeRecipeData(), WS_ID);
    const result = await getRecipeById(prisma, created.id, WS_ID);
    expect(result?.name).toBe('Test Recipe');
  });

  it('returns null for a different workspace', async () => {
    const created = await createRecipe(prisma, makeRecipeData(), WS_ID);
    const result = await getRecipeById(prisma, created.id, '00000000-0000-0000-0000-000000000099');
    expect(result).toBeNull();
  });
});

describe('getRecipes', () => {
  it('returns paginated results ordered by name', async () => {
    await createRecipe(prisma, { ...makeRecipeData(), name: 'Zucchini Pasta' }, WS_ID);
    await createRecipe(prisma, { ...makeRecipeData(), name: 'Apple Tart' }, WS_ID);
    const { items, total } = await getRecipes(prisma, WS_ID, { page: 1, pageSize: 20 });
    expect(total).toBe(2);
    expect(items[0].name).toBe('Apple Tart');
    expect(items[1].name).toBe('Zucchini Pasta');
  });

  it('filters by search', async () => {
    await createRecipe(prisma, { ...makeRecipeData(), name: 'Chicken Soup' }, WS_ID);
    await createRecipe(prisma, { ...makeRecipeData(), name: 'Beef Stew' }, WS_ID);
    const { items } = await getRecipes(prisma, WS_ID, { page: 1, pageSize: 20, search: 'chicken' });
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Chicken Soup');
  });

  it('filters by dishTypeId', async () => {
    await createRecipe(prisma, makeRecipeData(), WS_ID);
    const { items } = await getRecipes(prisma, WS_ID, {
      page: 1,
      pageSize: 20,
      dishTypeId: DT_ID,
    });
    expect(items).toHaveLength(1);
  });

  it('paginates correctly', async () => {
    await createRecipe(prisma, { ...makeRecipeData(), name: 'Recipe A' }, WS_ID);
    await createRecipe(prisma, { ...makeRecipeData(), name: 'Recipe B' }, WS_ID);
    await createRecipe(prisma, { ...makeRecipeData(), name: 'Recipe C' }, WS_ID);
    const { items, total } = await getRecipes(prisma, WS_ID, { page: 2, pageSize: 2 });
    expect(total).toBe(3);
    expect(items).toHaveLength(1);
  });
});

describe('updateRecipe', () => {
  it('updates name and instructions', async () => {
    const created = await createRecipe(prisma, makeRecipeData(), WS_ID);
    const result = await updateRecipe(prisma, created.id, {
      name: 'Updated Recipe',
      instructions: 'Mix well',
    });
    expect(result.name).toBe('Updated Recipe');
    expect(result.instructions).toBe('Mix well');
  });

  it('replaces dish types', async () => {
    const created = await createRecipe(prisma, makeRecipeData(), WS_ID);
    const newDt = await prisma.dishType.create({
      data: { name: 'Starter Test', workspace_id: WS_ID },
    });
    const result = await updateRecipe(prisma, created.id, { dishTypeIds: [newDt.id] });
    expect(result.recipe_dish_types).toHaveLength(1);
    expect(result.recipe_dish_types[0].dish_type.id).toBe(newDt.id);
  });

  it('replaces ingredients', async () => {
    const created = await createRecipe(prisma, makeRecipeData(), WS_ID);
    const newIng = await prisma.ingredient.create({
      data: { name: 'Tomato Test', workspace_id: WS_ID },
    });
    const result = await updateRecipe(prisma, created.id, {
      ingredients: [{ ingredientId: newIng.id, displayName: null, isMain: true }],
    });
    expect(result.recipe_ingredients).toHaveLength(1);
    expect(result.recipe_ingredients[0].ingredient.id).toBe(newIng.id);
  });
});

describe('deleteRecipe', () => {
  it('deletes recipe so it cannot be found', async () => {
    const created = await createRecipe(prisma, makeRecipeData(), WS_ID);
    await deleteRecipe(prisma, created.id);
    const result = await getRecipeById(prisma, created.id, WS_ID);
    expect(result).toBeNull();
  });
});

describe('getRecipeMealRecipes', () => {
  it('returns meal recipe rows with schedule info', async () => {
    const recipe = await createRecipe(prisma, makeRecipeData(), WS_ID);
    const scheduleDay = await prisma.scheduleDay.create({
      data: { schedule_id: SCHED_ID, date: new Date('2099-06-15') },
    });
    const scheduleMeal = await prisma.scheduleMeal.create({
      data: { schedule_day_id: scheduleDay.id, meal_type_id: MT_ID },
    });
    await prisma.mealRecipe.create({
      data: {
        schedule_meal_id: scheduleMeal.id,
        recipe_id: recipe.id,
        dish_type_id: DT_ID,
      },
    });

    const rows = await getRecipeMealRecipes(prisma, recipe.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].dish_type_id).toBe(DT_ID);
    expect(rows[0].schedule_meal.meal_type_id).toBe(MT_ID);
    expect(rows[0].schedule_meal.schedule_day.schedule.name).toBe('Test Schedule');
  });

  it('returns empty array when recipe has no meal assignments', async () => {
    const recipe = await createRecipe(prisma, makeRecipeData(), WS_ID);
    const rows = await getRecipeMealRecipes(prisma, recipe.id);
    expect(rows).toHaveLength(0);
  });
});
