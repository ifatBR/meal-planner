import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import authPlugin from '../../../plugins/auth';
import dishTypeRoutes from '../dish-types.routes';
import * as service from '../dish-types.service';
import errorHandler from '../../../plugins/errorHandler';

vi.mock('../dish-types.service');

const buildApp = async () => {
  const app = Fastify();
  app.decorate('prisma', {
    permission: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ id: 'perm-1', domain: 'dish-types', key: 'create' } as any),
    },
  } as any);
  await app.register(errorHandler);
  await app.register(cookie, { secret: 'test-secret' });
  await app.register(authPlugin);
  await app.register(dishTypeRoutes, { prefix: '/dish-types' });
  await app.ready();
  return app;
};

const signToken = (app: Awaited<ReturnType<typeof buildApp>>) =>
  app.jwt.sign({ userId: 'user-1', workspaceId: 'ws-1', role: 'admin' as const });

const DT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const mockDishType = { id: DT_ID, name: 'Main Course' };

describe('GET /dish-types', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with data', async () => {
    vi.mocked(service.listDishTypes).mockResolvedValue([mockDishType]);
    const res = await app.inject({
      method: 'GET',
      url: '/dish-types',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
    expect(res.json().data[0].name).toBe('Main Course');
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/dish-types' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /dish-types', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 201 with created dish type', async () => {
    vi.mocked(service.createDishType).mockResolvedValue(mockDishType);
    const res = await app.inject({
      method: 'POST',
      url: '/dish-types',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Main Course' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.name).toBe('Main Course');
  });

  it('returns 400 for empty name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/dish-types',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/dish-types',
      payload: { name: 'Main Course' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('PATCH /dish-types/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with updated dish type', async () => {
    vi.mocked(service.updateDishType).mockResolvedValue({ id: DT_ID, name: 'Starter' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/dish-types/${DT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Starter' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe('Starter');
  });

  it('returns 400 for invalid id param', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/dish-types/not-a-uuid',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Starter' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/dish-types/${DT_ID}`,
      payload: { name: 'Starter' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('DELETE /dish-types/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with success true', async () => {
    vi.mocked(service.deleteDishType).mockResolvedValue({ success: true });
    const res = await app.inject({
      method: 'DELETE',
      url: `/dish-types/${DT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.success).toBe(true);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/dish-types/${DT_ID}`,
    });
    expect(res.statusCode).toBe(401);
  });
});
