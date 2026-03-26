import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import authPlugin from '../../../plugins/auth';
import scheduleMealRoutes from '../schedule-meals.routes';
import errorHandler from '../../../plugins/errorHandler';
import * as service from '../schedule-meals.service';

vi.mock('../schedule-meals.service');

const MEAL_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const RECIPE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const buildApp = async (grantPermission = true) => {
  const app = Fastify();
  app.decorate('prisma', {
    permission: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          grantPermission ? { id: 'perm-1', domain: 'schedule-meals', key: 'update' } : null,
        ),
    },
  } as any);
  await app.register(errorHandler);
  await app.register(cookie, { secret: 'test-secret' });
  await app.register(authPlugin);
  await app.register(scheduleMealRoutes, { prefix: '/schedule-meals' });
  await app.ready();
  return app;
};

const signToken = (app: Awaited<ReturnType<typeof buildApp>>) =>
  app.jwt.sign({ userId: 'user-1', workspaceId: 'ws-1', role: 'admin' as const });

const mockMealResult = {
  id: MEAL_ID,
  meal_type_id: MT_ID,
  is_locked: false,
  is_manually_edited: true,
  meal_type: { id: MT_ID, name: 'Lunch' },
  meal_recipes: [
    {
      id: 'mr-1',
      recipe_id: RECIPE_ID,
      dish_type_id: DT_ID,
      recipe: { name: 'Test Recipe' },
      dish_type: { id: DT_ID, name: 'Main' },
    },
  ],
};

describe('PATCH /schedule-meals/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with updated meal', async () => {
    vi.mocked(service.patchScheduleMeal).mockResolvedValue(mockMealResult);
    const res = await app.inject({
      method: 'PATCH',
      url: `/schedule-meals/${MEAL_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { recipeIds: [RECIPE_ID] },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.id).toBe(MEAL_ID);
    expect(data.mealType.name).toBe('Lunch');
    expect(data.isManuallyEdited).toBe(true);
    expect(data.recipes).toHaveLength(1);
    expect(data.recipes[0].recipeId).toBe(RECIPE_ID);
    expect(data.recipes[0].dishType.id).toBe(DT_ID);
  });

  it('returns 200 when updating isLocked only', async () => {
    vi.mocked(service.patchScheduleMeal).mockResolvedValue({ ...mockMealResult, is_locked: true });
    const res = await app.inject({
      method: 'PATCH',
      url: `/schedule-meals/${MEAL_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { isLocked: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.isLocked).toBe(true);
  });

  it('returns 400 when neither recipeIds nor isLocked provided', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/schedule-meals/${MEAL_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid UUID in params', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/schedule-meals/not-a-uuid',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { isLocked: true },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/schedule-meals/${MEAL_ID}`,
      payload: { isLocked: true },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'PATCH',
      url: `/schedule-meals/${MEAL_ID}`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: { isLocked: true },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /schedule-meals/:id/recipes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with meal after clearing recipes', async () => {
    vi.mocked(service.clearScheduleMealRecipes).mockResolvedValue({
      ...mockMealResult,
      is_locked: false,
      meal_recipes: [],
    });
    const res = await app.inject({
      method: 'DELETE',
      url: `/schedule-meals/${MEAL_ID}/recipes`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.recipes).toHaveLength(0);
    expect(data.isLocked).toBe(false);
  });

  it('returns 400 for invalid UUID in params', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/schedule-meals/not-a-uuid/recipes',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/schedule-meals/${MEAL_ID}/recipes`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'DELETE',
      url: `/schedule-meals/${MEAL_ID}/recipes`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});
