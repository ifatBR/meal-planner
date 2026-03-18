import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  createIngredient,
  getIngredientById,
  listIngredients,
  updateIngredient,
  deleteIngredient,
  createVariant,
  getVariantById,
  deleteVariant,
} from '../ingredients.repository';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const WS_ID = '00000000-0000-0000-0000-000000000001';
const OTHER_WS = '00000000-0000-0000-0000-000000000002';

beforeAll(async () => {
  await prisma.workspace.upsert({
    where: { id: WS_ID },
    update: {},
    create: { id: WS_ID, name: 'Test Workspace' },
  });
});

beforeEach(async () => {
  await prisma.ingredientVariant.deleteMany();
  await prisma.ingredient.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createIngredient', () => {
  it('creates and returns ingredient with empty variants', async () => {
    const result = await createIngredient(prisma, { name: 'Salt', category: 'spices' }, WS_ID);
    expect(result.name).toBe('Salt');
    expect(result.category).toBe('spices');
    expect(result.workspace_id).toBe(WS_ID);
    expect(result.ingredient_variants).toEqual([]);
  });

  it('stores null category when not provided', async () => {
    const result = await createIngredient(prisma, { name: 'Salt' }, WS_ID);
    expect(result.category).toBeNull();
  });
});

describe('getIngredientById', () => {
  it('returns ingredient scoped to workspace', async () => {
    const created = await createIngredient(prisma, { name: 'Pepper' }, WS_ID);
    const result = await getIngredientById(prisma, created.id, WS_ID);
    expect(result?.name).toBe('Pepper');
  });

  it('returns null for a different workspace', async () => {
    const created = await createIngredient(prisma, { name: 'Pepper' }, WS_ID);
    const result = await getIngredientById(prisma, created.id, OTHER_WS);
    expect(result).toBeNull();
  });
});

describe('listIngredients', () => {
  it('returns all items and total', async () => {
    await createIngredient(prisma, { name: 'Basil' }, WS_ID);
    await createIngredient(prisma, { name: 'Oregano' }, WS_ID);
    const result = await listIngredients(prisma, WS_ID, { page: 1, pageSize: 10 });
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
  });

  it('searches by name (case-insensitive)', async () => {
    await createIngredient(prisma, { name: 'Basil' }, WS_ID);
    await createIngredient(prisma, { name: 'Oregano' }, WS_ID);
    const result = await listIngredients(prisma, WS_ID, { page: 1, pageSize: 10, search: 'BAS' });
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('Basil');
  });

  it('paginates correctly', async () => {
    await createIngredient(prisma, { name: 'Basil' }, WS_ID);
    await createIngredient(prisma, { name: 'Oregano' }, WS_ID);
    const result = await listIngredients(prisma, WS_ID, { page: 1, pageSize: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(2);
  });
});

describe('updateIngredient', () => {
  it('updates ingredient name', async () => {
    const created = await createIngredient(prisma, { name: 'Garlic' }, WS_ID);
    const result = await updateIngredient(prisma, created.id, WS_ID, { name: 'Black Garlic' });
    expect(result.name).toBe('Black Garlic');
  });
});

describe('deleteIngredient', () => {
  it('deletes ingredient so it cannot be found', async () => {
    const created = await createIngredient(prisma, { name: 'Thyme' }, WS_ID);
    await deleteIngredient(prisma, created.id);
    const result = await getIngredientById(prisma, created.id, WS_ID);
    expect(result).toBeNull();
  });
});

describe('variant operations', () => {
  it('creates, finds, and deletes variant', async () => {
    const ing = await createIngredient(prisma, { name: 'Eggplant' }, WS_ID);
    const variant = await createVariant(
      prisma,
      { ingredientId: ing.id, variant: 'Aubergine' },
      WS_ID,
    );

    const found = await getVariantById(prisma, variant.id, WS_ID);
    expect(found?.variant).toBe('Aubergine');
    expect(found?.ingredient_id).toBe(ing.id);

    await deleteVariant(prisma, variant.id);
    const gone = await getVariantById(prisma, variant.id, WS_ID);
    expect(gone).toBeNull();
  });

  it('getVariantById returns null for different workspace', async () => {
    const ing = await createIngredient(prisma, { name: 'Eggplant' }, WS_ID);
    const variant = await createVariant(
      prisma,
      { ingredientId: ing.id, variant: 'Aubergine' },
      WS_ID,
    );
    const result = await getVariantById(prisma, variant.id, OTHER_WS);
    expect(result).toBeNull();
  });
});
