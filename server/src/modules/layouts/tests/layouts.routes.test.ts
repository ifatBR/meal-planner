import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import authPlugin from '../../../plugins/auth';
import layoutRoutes from '../layouts.routes';
import errorHandler from '../../../plugins/errorHandler';
import * as service from '../layouts.service';
import { LayoutConflictError } from '../../../utils/errors';

vi.mock('../layouts.service');

const LAYOUT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SCHED_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const DT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const buildApp = async (grantPermission = true) => {
  const app = Fastify();
  app.decorate('prisma', {
    permission: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          grantPermission ? { id: 'perm-1', domain: 'layouts', key: 'create' } : null,
        ),
    },
  } as any);
  await app.register(errorHandler);
  await app.register(cookie, { secret: 'test-secret' });
  await app.register(authPlugin);
  await app.register(layoutRoutes, { prefix: '/layouts' });
  await app.ready();
  return app;
};

const signToken = (app: Awaited<ReturnType<typeof buildApp>>) =>
  app.jwt.sign({ userId: 'user-1', workspaceId: 'ws-1', role: 'admin' as const });

const mockListItem = {
  id: LAYOUT_ID,
  name: 'Test Layout',
  _count: { schedules: 0 },
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const mockDetailLayout = {
  id: LAYOUT_ID,
  name: 'Test Layout',
  schedules: [],
  week_days_layouts: [
    {
      id: 'wdl-1',
      days: [0, 1, 2],
      meal_slots: [
        {
          id: 'slot-1',
          order: 0,
          meal_type: { id: 'mt-1', name: 'Lunch' },
          dish_allocations: [{ id: 'da-1', amount: 2, dish_type: { id: 'dt-1', name: 'Main' } }],
        },
      ],
    },
  ],
};

const mockSummary = {
  id: LAYOUT_ID,
  name: 'Test Layout',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const mockUpdateResult = {
  id: LAYOUT_ID,
  name: 'Test Layout',
  updated_at: new Date('2026-01-01'),
  schedules: [],
};

describe('GET /layouts', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with list of layouts', async () => {
    vi.mocked(service.listLayouts).mockResolvedValue([mockListItem]);
    const res = await app.inject({
      method: 'GET',
      url: '/layouts',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.items).toHaveLength(1);
    expect(res.json().data.items[0].inUse).toBe(false);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/layouts' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /layouts/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with full layout detail', async () => {
    vi.mocked(service.fetchLayoutById).mockResolvedValue(mockDetailLayout);
    const res = await app.inject({
      method: 'GET',
      url: `/layouts/${LAYOUT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.id).toBe(LAYOUT_ID);
    expect(data.weekDaysLayouts[0].mealSlots[0].mealType.name).toBe('Lunch');
    expect(data.weekDaysLayouts[0].mealSlots[0].dishAllocations[0].amount).toBe(2);
  });

  it('returns 400 for invalid id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/layouts/not-a-uuid',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: `/layouts/${LAYOUT_ID}` });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /layouts', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  const validBody = {
    name: 'New Layout',
    weekDaysLayouts: [
      {
        days: [0, 1, 2],
        mealSlots: [{ mealTypeId: MT_ID, dishAllocations: [{ dishTypeId: DT_ID, amount: 2 }] }],
      },
    ],
  };

  it('returns 201 with layout summary', async () => {
    vi.mocked(service.createLayout).mockResolvedValue(mockSummary);
    const res = await app.inject({
      method: 'POST',
      url: '/layouts',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: validBody,
    });
    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.inUse).toBe(false);
    expect(data.usedBySchedules).toEqual([]);
  });

  it('returns 400 for missing weekDaysLayouts', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/layouts',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Bad' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'POST', url: '/layouts', payload: validBody });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'POST',
      url: '/layouts',
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: validBody,
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /layouts/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with updated layout', async () => {
    vi.mocked(service.updateLayout).mockResolvedValue(mockUpdateResult);
    const res = await app.inject({
      method: 'PATCH',
      url: `/layouts/${LAYOUT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Renamed' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.inUse).toBe(false);
  });

  it('passes scheduleId query param to service', async () => {
    vi.mocked(service.updateLayout).mockResolvedValue(mockUpdateResult);
    await app.inject({
      method: 'PATCH',
      url: `/layouts/${LAYOUT_ID}?scheduleId=${SCHED_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Renamed' },
    });
    expect(service.updateLayout).toHaveBeenCalledWith(
      expect.anything(),
      LAYOUT_ID,
      'ws-1',
      expect.anything(),
      SCHED_ID,
    );
  });

  it('returns 409 with usedBySchedules when LayoutConflictError is thrown', async () => {
    vi.mocked(service.updateLayout).mockRejectedValue(
      new LayoutConflictError('layout_structural_edit_blocked', 'In use.', [
        { id: SCHED_ID, name: 'Schedule A' },
      ]),
    );
    const res = await app.inject({
      method: 'PATCH',
      url: `/layouts/${LAYOUT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'X' },
    });
    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error).toBe('layout_structural_edit_blocked');
    expect(body.usedBySchedules).toHaveLength(1);
  });

  it('returns 400 when no fields provided', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/layouts/${LAYOUT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'PATCH',
      url: `/layouts/${LAYOUT_ID}`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: { name: 'X' },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /layouts/:id/clone', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 201 with cloned layout summary', async () => {
    vi.mocked(service.cloneLayout).mockResolvedValue({ ...mockSummary, name: 'Clone' });
    const res = await app.inject({
      method: 'POST',
      url: `/layouts/${LAYOUT_ID}/clone`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Clone' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.name).toBe('Clone');
    expect(res.json().data.inUse).toBe(false);
  });

  it('returns 400 for missing name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/layouts/${LAYOUT_ID}/clone`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'POST',
      url: `/layouts/${LAYOUT_ID}/clone`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: { name: 'Clone' },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /layouts/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with success true', async () => {
    vi.mocked(service.deleteLayout).mockResolvedValue({ success: true });
    const res = await app.inject({
      method: 'DELETE',
      url: `/layouts/${LAYOUT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.success).toBe(true);
  });

  it('passes scheduleId query param to service', async () => {
    vi.mocked(service.deleteLayout).mockResolvedValue({ success: true });
    await app.inject({
      method: 'DELETE',
      url: `/layouts/${LAYOUT_ID}?scheduleId=${SCHED_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(service.deleteLayout).toHaveBeenCalledWith(
      expect.anything(),
      LAYOUT_ID,
      'ws-1',
      SCHED_ID,
    );
  });

  it('returns 409 with usedBySchedules when LayoutConflictError is thrown', async () => {
    vi.mocked(service.deleteLayout).mockRejectedValue(
      new LayoutConflictError('layout_in_use', 'In use.', [{ id: SCHED_ID, name: 'Schedule A' }]),
    );
    const res = await app.inject({
      method: 'DELETE',
      url: `/layouts/${LAYOUT_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('layout_in_use');
    expect(res.json().usedBySchedules).toHaveLength(1);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/layouts/${LAYOUT_ID}` });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'DELETE',
      url: `/layouts/${LAYOUT_ID}`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});
