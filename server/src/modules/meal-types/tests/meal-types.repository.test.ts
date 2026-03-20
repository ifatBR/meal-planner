import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  listMealTypes,
  getMealTypeById,
  createMealType,
  updateMealType,
  deleteMealType,
} from '../meal-types.repository';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const WS_ID = '00000000-0000-0000-0003-000000000001';
const OTHER_WS = '00000000-0000-0000-0003-000000000099';

beforeAll(async () => {
  await prisma.workspace.upsert({
    where: { id: WS_ID },
    update: {},
    create: { id: WS_ID, name: 'Test Workspace' },
  });
});

beforeEach(async () => {
  await prisma.mealType.deleteMany({ where: { workspace_id: WS_ID } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createMealType', () => {
  it('creates and returns meal type with id and name', async () => {
    const result = await createMealType(prisma, { name: 'Breakfast' }, WS_ID);
    expect(result.name).toBe('Breakfast');
    expect(result.id).toBeDefined();
  });
});

describe('getMealTypeById', () => {
  it('returns meal type scoped to workspace', async () => {
    const created = await createMealType(prisma, { name: 'Lunch' }, WS_ID);
    const result = await getMealTypeById(prisma, created.id, WS_ID);
    expect(result?.name).toBe('Lunch');
  });

  it('returns null for a different workspace', async () => {
    const created = await createMealType(prisma, { name: 'Lunch' }, WS_ID);
    const result = await getMealTypeById(prisma, created.id, OTHER_WS);
    expect(result).toBeNull();
  });
});

describe('listMealTypes', () => {
  it('returns all meal types ordered by name', async () => {
    await createMealType(prisma, { name: 'Dinner' }, WS_ID);
    await createMealType(prisma, { name: 'Breakfast' }, WS_ID);
    const result = await listMealTypes(prisma, WS_ID);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Breakfast');
    expect(result[1].name).toBe('Dinner');
  });

  it('returns only meal types for the workspace', async () => {
    await createMealType(prisma, { name: 'Breakfast' }, WS_ID);
    const result = await listMealTypes(prisma, OTHER_WS);
    expect(result).toHaveLength(0);
  });
});

describe('updateMealType', () => {
  it('updates meal type name', async () => {
    const created = await createMealType(prisma, { name: 'Breakfast' }, WS_ID);
    const result = await updateMealType(prisma, created.id, { name: 'Brunch' });
    expect(result.name).toBe('Brunch');
  });
});

describe('deleteMealType', () => {
  it('deletes meal type so it cannot be found', async () => {
    const created = await createMealType(prisma, { name: 'Snack' }, WS_ID);
    await deleteMealType(prisma, created.id);
    const result = await getMealTypeById(prisma, created.id, WS_ID);
    expect(result).toBeNull();
  });
});
