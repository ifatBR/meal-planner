import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import authPlugin from '../../../plugins/auth';
import mealTypeRoutes from '../meal-types.routes';
import * as service from '../meal-types.service';
import errorHandler from '../../../plugins/errorHandler';

vi.mock('../meal-types.service');

const buildApp = async (grantPermission = true) => {
  const app = Fastify();
  app.decorate('prisma', {
    permission: {
      findFirst: vi.fn().mockResolvedValue(
        grantPermission ? { id: 'perm-1', domain: 'meal-types', key: 'create' } : null,
      ),
    },
  } as any);
  await app.register(errorHandler);
  await app.register(cookie, { secret: 'test-secret' });
  await app.register(authPlugin);
  await app.register(mealTypeRoutes, { prefix: '/meal-types' });
  await app.ready();
  return app;
};

const signToken = (app: Awaited<ReturnType<typeof buildApp>>) =>
  app.jwt.sign({ userId: 'user-1', workspaceId: 'ws-1', role: 'admin' as const });

const MT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const mockMealType = { id: MT_ID, name: 'Breakfast' };

describe('GET /meal-types', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with data', async () => {
    vi.mocked(service.listMealTypes).mockResolvedValue([mockMealType]);
    const res = await app.inject({
      method: 'GET',
      url: '/meal-types',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
    expect(res.json().data[0].name).toBe('Breakfast');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/meal-types' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /meal-types', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 201 with created meal type', async () => {
    vi.mocked(service.createMealType).mockResolvedValue(mockMealType);
    const res = await app.inject({
      method: 'POST',
      url: '/meal-types',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Breakfast' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.name).toBe('Breakfast');
  });

  it('returns 400 for empty name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/meal-types',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/meal-types',
      payload: { name: 'Breakfast' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'POST',
      url: '/meal-types',
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: { name: 'Breakfast' },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /meal-types/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with updated meal type', async () => {
    vi.mocked(service.updateMealType).mockResolvedValue({ id: MT_ID, name: 'Lunch' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/meal-types/${MT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Lunch' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe('Lunch');
  });

  it('returns 400 for invalid id param', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/meal-types/not-a-uuid',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Lunch' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/meal-types/${MT_ID}`,
      payload: { name: 'Lunch' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'PATCH',
      url: `/meal-types/${MT_ID}`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: { name: 'Lunch' },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /meal-types/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with success true', async () => {
    vi.mocked(service.deleteMealType).mockResolvedValue({ success: true });
    const res = await app.inject({
      method: 'DELETE',
      url: `/meal-types/${MT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.success).toBe(true);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/meal-types/${MT_ID}` });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'DELETE',
      url: `/meal-types/${MT_ID}`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});
