import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyError } from 'fastify';
import cookie from '@fastify/cookie';
import prismaPlugin from '../../../plugins/prisma';
import authPlugin from '../../../plugins/auth';
import ingredientRoutes from '../ingredients.routes';
import * as service from '../ingredients.service';
import errorHandler from '../../../plugins/errorHandler';

vi.mock('../ingredients.service');

const buildApp = async () => {
  const app = Fastify();
  app.decorate('prisma', {
    permission: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: 'perm-1', domain: 'ingredients', key: 'create' } as any),
    },
  } as any);
  await app.register(errorHandler);
  await app.register(cookie, { secret: 'test-secret' });
  await app.register(authPlugin);
  await app.register(ingredientRoutes, { prefix: '/ingredients' });
  await app.ready();
  return app;
};

const signToken = (app: Awaited<ReturnType<typeof buildApp>>) =>
  app.jwt.sign({ userId: 'user-1', workspaceId: 'ws-1', role: 'admin' as const });

const ING_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const VARIANT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const mockIngredient = {
  id: ING_ID,
  name: 'Salt',
  category: null as string | null,
  workspace_id: 'ws-1',
  created_at: new Date(),
  updated_at: new Date(),
  ingredient_variants: [] as { id: string; variant: string }[],
};

describe('GET /ingredients', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with paginated data', async () => {
    vi.mocked(service.listIngredients).mockResolvedValue({
      items: [mockIngredient],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/ingredients',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.items).toHaveLength(1);
    expect(res.json().data.items[0].category).toBeNull();
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/ingredients' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /ingredients/match', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with match result', async () => {
    vi.mocked(service.matchIngredient).mockResolvedValue({
      matched: true,
      ingredient: mockIngredient,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/ingredients/match',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'aubergine' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.matched).toBe(true);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ingredients/match',
      payload: { name: 'aubergine' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /ingredients', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 201 with created ingredient', async () => {
    vi.mocked(service.createIngredient).mockResolvedValue(mockIngredient);
    const res = await app.inject({
      method: 'POST',
      url: '/ingredients',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Salt' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.name).toBe('Salt');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ingredients',
      payload: { name: 'Salt' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /ingredients/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with ingredient', async () => {
    vi.mocked(service.fetchIngredientById).mockResolvedValue(mockIngredient);
    const res = await app.inject({
      method: 'GET',
      url: `/ingredients/${ING_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe('Salt');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: `/ingredients/${ING_ID}` });
    expect(res.statusCode).toBe(401);
  });
});

describe('PATCH /ingredients/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with updated ingredient', async () => {
    vi.mocked(service.updateIngredient).mockResolvedValue({ ...mockIngredient, name: 'Pepper' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/ingredients/${ING_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Pepper' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe('Pepper');
  });
});

describe('DELETE /ingredients/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with deleted id', async () => {
    vi.mocked(service.deleteIngredient).mockResolvedValue({ id: ING_ID });
    const res = await app.inject({
      method: 'DELETE',
      url: `/ingredients/${ING_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.id).toBe(ING_ID);
  });
});

describe('POST /ingredients/:id/variants', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 201 with created variant', async () => {
    vi.mocked(service.addVariant).mockResolvedValue({
      id: VARIANT_ID,
      variant: 'table salt',
      ingredient_id: ING_ID,
      workspace_id: 'ws-1',
    });
    const res = await app.inject({
      method: 'POST',
      url: `/ingredients/${ING_ID}/variants`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { variant: 'table salt' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.variant).toBe('table salt');
  });
});

describe('DELETE /ingredients/:id/variants/:variantId', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with deleted variant id', async () => {
    vi.mocked(service.removeVariant).mockResolvedValue({ id: VARIANT_ID });
    const res = await app.inject({
      method: 'DELETE',
      url: `/ingredients/${ING_ID}/variants/${VARIANT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.id).toBe(VARIANT_ID);
  });
});
