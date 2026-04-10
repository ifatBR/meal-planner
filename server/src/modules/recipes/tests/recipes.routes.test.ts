import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import authPlugin from '../../../plugins/auth';
import recipeRoutes from '../recipes.routes';
import * as service from '../recipes.service';
import errorHandler from '../../../plugins/errorHandler';
import { ScheduleConflictError } from '../../../utils/errors';

vi.mock('../recipes.service');

const buildApp = async (grantPermission = true) => {
  const app = Fastify();
  app.decorate('prisma', {
    permission: {
      findFirst: vi.fn().mockResolvedValue(
        grantPermission ? { id: 'perm-1', domain: 'recipes', key: 'create' } : null,
      ),
    },
  } as any);
  await app.register(errorHandler);
  await app.register(cookie, { secret: 'test-secret' });
  await app.register(authPlugin);
  await app.register(recipeRoutes, { prefix: '/recipes' });
  await app.ready();
  return app;
};

const signToken = (app: Awaited<ReturnType<typeof buildApp>>) =>
  app.jwt.sign({ userId: 'user-1', workspaceId: 'ws-1', role: 'admin' as const });

const RECIPE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const mockRecipeRow = {
  id: RECIPE_ID,
  name: 'Chicken Soup',
  instructions: null,
  recipe_dish_types: [{ dish_type: { id: 'dt-1', name: 'Main Course' } }],
  recipe_meal_types: [{ meal_type: { id: 'mt-1', name: 'Lunch' } }],
  recipe_ingredients: [
    {
      id: 'ri-1',
      is_main: true,
      display_name: null,
      amount: null,
      ingredient: { id: 'ing-1', name: 'Chicken' },
      unit: null,
    },
  ],
};

const mockListResult = {
  items: [mockRecipeRow],
  meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};

describe('GET /recipes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { app = await buildApp(); });
  afterEach(async () => { await app.close(); });

  it('returns 200 with mapped data', async () => {
    vi.mocked(service.listRecipes).mockResolvedValue(mockListResult);
    const res = await app.inject({
      method: 'GET',
      url: '/recipes',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.items[0].name).toBe('Chicken Soup');
    expect(body.data.items[0].dishTypes[0].name).toBe('Main Course');
    expect(body.data.items[0].ingredients[0].isMain).toBe(true);
    expect(body.data.items[0].ingredients[0].displayName).toBe('Chicken');
    expect(body.data.meta.total).toBe(1);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/recipes' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /recipes/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { app = await buildApp(); });
  afterEach(async () => { await app.close(); });

  it('returns 200 with recipe detail', async () => {
    vi.mocked(service.fetchRecipeById).mockResolvedValue(mockRecipeRow);
    const res = await app.inject({
      method: 'GET',
      url: `/recipes/${RECIPE_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe('Chicken Soup');
    expect(res.json().data.mealTypes[0].name).toBe('Lunch');
  });

  it('returns 400 for invalid id param', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/recipes/not-a-uuid',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: `/recipes/${RECIPE_ID}` });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /recipes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { app = await buildApp(); });
  afterEach(async () => { await app.close(); });

  const validBody = {
    name: 'Chicken Soup',
    dishTypeIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab'],
    mealTypeIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac'],
    ingredients: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaad', isMain: true }],
  };

  it('returns 201 with created recipe', async () => {
    vi.mocked(service.createRecipe).mockResolvedValue(mockRecipeRow);
    const res = await app.inject({
      method: 'POST',
      url: '/recipes',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: validBody,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.name).toBe('Chicken Soup');
  });

  it('returns 400 for missing dishTypeIds', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/recipes',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Test', mealTypeIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab'], ingredients: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/recipes',
      payload: validBody,
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'POST',
      url: '/recipes',
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: validBody,
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /recipes/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { app = await buildApp(); });
  afterEach(async () => { await app.close(); });

  it('returns 200 with updated recipe', async () => {
    vi.mocked(service.updateRecipe).mockResolvedValue({ ...mockRecipeRow, name: 'Updated' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/recipes/${RECIPE_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Updated' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe('Updated');
  });

  it('returns 400 for invalid id param', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/recipes/not-a-uuid',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Updated' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for empty body', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/recipes/${RECIPE_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 409 with affected_schedules on conflict', async () => {
    vi.mocked(service.updateRecipe).mockRejectedValue(
      new ScheduleConflictError('recipe_dish_type_conflict', 'Conflict detected', [
        { scheduleId: 'sched-1', scheduleName: 'Summer Plan', dates: ['2099-06-15'] },
      ]),
    );
    const res = await app.inject({
      method: 'PATCH',
      url: `/recipes/${RECIPE_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Updated' },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error).toBe('recipe_dish_type_conflict');
    expect(body.affected_schedules).toHaveLength(1);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/recipes/${RECIPE_ID}`,
      payload: { name: 'Updated' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'PATCH',
      url: `/recipes/${RECIPE_ID}`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: { name: 'Updated' },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /recipes/:id/clone', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { app = await buildApp(); });
  afterEach(async () => { await app.close(); });

  it('returns 201 with cloned recipe', async () => {
    vi.mocked(service.cloneRecipeById).mockResolvedValue({ ...mockRecipeRow, name: 'Clone' });
    const res = await app.inject({
      method: 'POST',
      url: `/recipes/${RECIPE_ID}/clone`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Clone' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.name).toBe('Clone');
  });

  it('returns 404 when original recipe not found', async () => {
    vi.mocked(service.cloneRecipeById).mockRejectedValue(
      Object.assign(new Error('recipe not found'), { statusCode: 404 }),
    );
    const res = await app.inject({
      method: 'POST',
      url: `/recipes/${RECIPE_ID}/clone`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Clone' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 409 when name already exists', async () => {
    vi.mocked(service.cloneRecipeById).mockRejectedValue(
      Object.assign(new Error('recipe already exists'), { statusCode: 409 }),
    );
    const res = await app.inject({
      method: 'POST',
      url: `/recipes/${RECIPE_ID}/clone`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Clone' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('returns 400 for missing name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/recipes/${RECIPE_ID}/clone`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/recipes/${RECIPE_ID}/clone`,
      payload: { name: 'Clone' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'POST',
      url: `/recipes/${RECIPE_ID}/clone`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: { name: 'Clone' },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /recipes/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => { app = await buildApp(); });
  afterEach(async () => { await app.close(); });

  it('returns 200 with success true', async () => {
    vi.mocked(service.deleteRecipe).mockResolvedValue({ success: true });
    const res = await app.inject({
      method: 'DELETE',
      url: `/recipes/${RECIPE_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.success).toBe(true);
  });

  it('returns 409 with affected_schedules when recipe is in use', async () => {
    vi.mocked(service.deleteRecipe).mockRejectedValue(
      new ScheduleConflictError('recipe_in_use', 'Recipe is in use', [
        { scheduleId: 'sched-1', scheduleName: 'Summer Plan', dates: ['2099-06-15'] },
      ]),
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/recipes/${RECIPE_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error).toBe('recipe_in_use');
    expect(body.affected_schedules[0].scheduleName).toBe('Summer Plan');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/recipes/${RECIPE_ID}` });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'DELETE',
      url: `/recipes/${RECIPE_ID}`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});
