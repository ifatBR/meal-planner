import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import authPlugin from '../../../plugins/auth';
import scheduleRoutes from '../schedules.routes';
import errorHandler from '../../../plugins/errorHandler';
import * as service from '../schedules.service';

vi.mock('../schedules.service');

const SCHED_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const LAYOUT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const buildApp = async (grantPermission = true) => {
  const app = Fastify();
  app.decorate('prisma', {
    permission: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          grantPermission ? { id: 'perm-1', domain: 'schedules', key: 'create' } : null,
        ),
    },
  } as any);
  await app.register(errorHandler);
  await app.register(cookie, { secret: 'test-secret' });
  await app.register(authPlugin);
  await app.register(scheduleRoutes, { prefix: '/schedules' });
  await app.ready();
  return app;
};

const signToken = (app: Awaited<ReturnType<typeof buildApp>>) =>
  app.jwt.sign({ userId: 'user-1', workspaceId: 'ws-1', role: 'admin' as const });

const mockScheduleRow = {
  id: SCHED_ID,
  name: 'Test Schedule',
  layout_id: LAYOUT_ID,
  start_date: new Date('2026-03-01'),
  end_date: new Date('2026-04-01'),
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

describe('GET /schedules', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with paginated list', async () => {
    vi.mocked(service.listSchedules).mockResolvedValue({
      items: [mockScheduleRow],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/schedules?page=1&pageSize=20',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.items).toHaveLength(1);
    expect(res.json().data.items[0].name).toBe('Test Schedule');
    expect(res.json().data.items[0].startDate).toBe('2026-03-01');
    expect(res.json().data.meta.total).toBe(1);
  });

  it('returns 200 when page and pageSize are omitted (defaults apply)', async () => {
    vi.mocked(service.listSchedules).mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/schedules',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/schedules?page=1&pageSize=20' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /schedules', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  const validBody = {
    name: 'New Schedule',
    layoutId: LAYOUT_ID,
    startDate: '2026-03-01',
    endDate: '2026-04-01',
  };

  it('returns 201 with schedule', async () => {
    vi.mocked(service.createSchedule).mockResolvedValue(mockScheduleRow);
    const res = await app.inject({
      method: 'POST',
      url: '/schedules',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: validBody,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.name).toBe('Test Schedule');
    expect(res.json().data.startDate).toBe('2026-03-01');
    expect(res.json().data.layoutId).toBe(LAYOUT_ID);
  });

  it('returns 400 for missing name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/schedules',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { layoutId: LAYOUT_ID, startDate: '2026-03-01', endDate: '2026-04-01' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid date format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/schedules',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { ...validBody, startDate: 'not-a-date' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'POST', url: '/schedules', payload: validBody });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'POST',
      url: '/schedules',
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: validBody,
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /schedules/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with schedule', async () => {
    vi.mocked(service.fetchScheduleById).mockResolvedValue(mockScheduleRow);
    const res = await app.inject({
      method: 'GET',
      url: `/schedules/${SCHED_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.id).toBe(SCHED_ID);
    expect(res.json().data.name).toBe('Test Schedule');
  });

  it('returns 400 for invalid UUID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/schedules/not-a-uuid',
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: `/schedules/${SCHED_ID}` });
    expect(res.statusCode).toBe(401);
  });
});

describe('PATCH /schedules/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with updated schedule', async () => {
    vi.mocked(service.updateSchedule).mockResolvedValue({ ...mockScheduleRow, name: 'Renamed' });
    const res = await app.inject({
      method: 'PATCH',
      url: `/schedules/${SCHED_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { name: 'Renamed' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.name).toBe('Renamed');
  });

  it('returns 400 for missing name', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/schedules/${SCHED_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/schedules/${SCHED_ID}`,
      payload: { name: 'X' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'PATCH',
      url: `/schedules/${SCHED_ID}`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: { name: 'X' },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('DELETE /schedules/:id', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with success true', async () => {
    vi.mocked(service.deleteSchedule).mockResolvedValue({ success: true });
    const res = await app.inject({
      method: 'DELETE',
      url: `/schedules/${SCHED_ID}`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.success).toBe(true);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'DELETE', url: `/schedules/${SCHED_ID}` });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'DELETE',
      url: `/schedules/${SCHED_ID}`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /schedules/:id/settings', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with settings', async () => {
    vi.mocked(service.fetchScheduleSettings).mockResolvedValue({
      recipe_gap: 3,
      main_ing_gap: 7,
      is_allow_same_day_ing: false,
      blocked_meals: [],
    });
    const res = await app.inject({
      method: 'GET',
      url: `/schedules/${SCHED_ID}/settings`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.recipeGap).toBe(3);
    expect(data.mainIngGap).toBe(7);
    expect(data.isAllowSameDayIng).toBe(false);
    expect(data.blockedMeals).toEqual([]);
  });

  it('groups blocked meals by date', async () => {
    vi.mocked(service.fetchScheduleSettings).mockResolvedValue({
      recipe_gap: 3,
      main_ing_gap: 7,
      is_allow_same_day_ing: false,
      blocked_meals: [
        { date: new Date('2026-03-01'), meal_type_id: MT_ID },
        { date: new Date('2026-03-01'), meal_type_id: 'cccccccc-cccc-cccc-cccc-cccccccccccd' },
      ],
    });
    const res = await app.inject({
      method: 'GET',
      url: `/schedules/${SCHED_ID}/settings`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.blockedMeals).toHaveLength(1);
    expect(data.blockedMeals[0].date).toBe('2026-03-01');
    expect(data.blockedMeals[0].mealTypeIds).toHaveLength(2);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: `/schedules/${SCHED_ID}/settings` });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /schedules/:id/calendar', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with calendar data', async () => {
    vi.mocked(service.fetchScheduleCalendar).mockResolvedValue({
      anchorDate: '2026-03-15',
      days: [],
    });
    const res = await app.inject({
      method: 'GET',
      url: `/schedules/${SCHED_ID}/calendar?anchorDate=2026-03-15`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.anchorDate).toBe('2026-03-15');
    expect(data.days).toEqual([]);
  });

  it('returns 400 for missing anchorDate', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/schedules/${SCHED_ID}/calendar`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid anchorDate format', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/schedules/${SCHED_ID}/calendar?anchorDate=not-a-date`,
      headers: { authorization: `Bearer ${signToken(app)}` },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/schedules/${SCHED_ID}/calendar?anchorDate=2026-03-15`,
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /schedules/:id/generate', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  const validBody = {
    layoutId: LAYOUT_ID,
    settings: { recipeGap: 3, mainIngGap: 7, isAllowSameDayIng: false },
  };

  it('returns 200 with generation result', async () => {
    vi.mocked(service.generateScheduleService).mockResolvedValue({
      schedule: mockScheduleRow,
      settings: { recipeGap: 3, mainIngGap: 7, isAllowSameDayIng: false, blockedMeals: [] },
      calendar: { anchorDate: '2026-03-01', days: [] },
      generationSummary: {
        requestedDays: 31,
        processedMealSlots: 31,
        generatedMealSlots: 31,
        skippedLockedMealSlots: 0,
        skippedBlockedMealSlots: 0,
        partialMealSlots: 0,
        emptyMealSlots: 0,
      },
      warnings: [],
    });
    const res = await app.inject({
      method: 'POST',
      url: `/schedules/${SCHED_ID}/generate`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: validBody,
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.schedule.id).toBe(SCHED_ID);
    expect(data.schedule.startDate).toBe('2026-03-01');
    expect(data.settings.recipeGap).toBe(3);
    expect(data.generationSummary.requestedDays).toBe(31);
    expect(data.warnings).toEqual([]);
  });

  it('returns 400 for missing layoutId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/schedules/${SCHED_ID}/generate`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { settings: { recipeGap: 3, mainIngGap: 7, isAllowSameDayIng: false } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for missing settings', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/schedules/${SCHED_ID}/generate`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { layoutId: LAYOUT_ID },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/schedules/${SCHED_ID}/generate`,
      payload: validBody,
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'POST',
      url: `/schedules/${SCHED_ID}/generate`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: validBody,
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});
