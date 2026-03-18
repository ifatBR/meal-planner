import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  listDishTypes,
  getDishTypeById,
  createDishType,
  updateDishType,
  deleteDishType,
} from '../dish-types.repository';

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
  await prisma.dishType.deleteMany({ where: { workspace_id: WS_ID } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('createDishType', () => {
  it('creates and returns dish type with id and name', async () => {
    const result = await createDishType(prisma, { name: 'Main Course' }, WS_ID);
    expect(result.name).toBe('Main Course');
    expect(result.id).toBeDefined();
  });
});

describe('getDishTypeById', () => {
  it('returns dish type scoped to workspace', async () => {
    const created = await createDishType(prisma, { name: 'Starter' }, WS_ID);
    const result = await getDishTypeById(prisma, created.id, WS_ID);
    expect(result?.name).toBe('Starter');
  });

  it('returns null for a different workspace', async () => {
    const created = await createDishType(prisma, { name: 'Starter' }, WS_ID);
    const result = await getDishTypeById(prisma, created.id, OTHER_WS);
    expect(result).toBeNull();
  });
});

describe('listDishTypes', () => {
  it('returns all dish types ordered by name', async () => {
    await createDishType(prisma, { name: 'Starter' }, WS_ID);
    await createDishType(prisma, { name: 'Dessert' }, WS_ID);
    const result = await listDishTypes(prisma, WS_ID);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Dessert');
    expect(result[1].name).toBe('Starter');
  });

  it('returns only dish types for the workspace', async () => {
    await createDishType(prisma, { name: 'Main Course' }, WS_ID);
    const result = await listDishTypes(prisma, OTHER_WS);
    expect(result).toHaveLength(0);
  });
});

describe('updateDishType', () => {
  it('updates dish type name', async () => {
    const created = await createDishType(prisma, { name: 'Starter' }, WS_ID);
    const result = await updateDishType(prisma, created.id, { name: 'Appetizer' });
    expect(result.name).toBe('Appetizer');
  });
});

describe('deleteDishType', () => {
  it('deletes dish type so it cannot be found', async () => {
    const created = await createDishType(prisma, { name: 'Side Dish' }, WS_ID);
    await deleteDishType(prisma, created.id);
    const result = await getDishTypeById(prisma, created.id, WS_ID);
    expect(result).toBeNull();
  });
});
