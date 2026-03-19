import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import authPlugin from '../../../plugins/auth';
import layoutRoutes from '../layouts.routes';
import * as service from '../layouts.service';
import errorHandler from '../../../plugins/errorHandler';

vi.mock('../layouts.service');

const LAYOUT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SLOT_1 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SLOT_2 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const buildApp = async (grantPermission = true) => {
  const app = Fastify();
  app.decorate('prisma', {
    permission: {
      findFirst: vi.fn().mockResolvedValue(
        grantPermission ? { id: 'perm-1', domain: 'schedules', key: 'update' } : null,
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

describe('PATCH /layouts/:layoutId/slots/reorder', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    app = await buildApp();
  });
  afterEach(async () => {
    await app.close();
  });

  it('returns 200 with success true', async () => {
    vi.mocked(service.reorderSlots).mockResolvedValue({ success: true });
    const res = await app.inject({
      method: 'PATCH',
      url: `/layouts/${LAYOUT_ID}/slots/reorder`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { slotIds: [SLOT_1, SLOT_2] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.success).toBe(true);
  });

  it('passes workspaceId from JWT to service', async () => {
    vi.mocked(service.reorderSlots).mockResolvedValue({ success: true });
    await app.inject({
      method: 'PATCH',
      url: `/layouts/${LAYOUT_ID}/slots/reorder`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { slotIds: [SLOT_1] },
    });
    expect(service.reorderSlots).toHaveBeenCalledWith(
      expect.anything(),
      LAYOUT_ID,
      'ws-1',
      [SLOT_1],
    );
  });

  it('returns 400 for invalid layoutId param', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/layouts/not-a-uuid/slots/reorder',
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { slotIds: [] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for non-uuid in slotIds', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/layouts/${LAYOUT_ID}/slots/reorder`,
      headers: { authorization: `Bearer ${signToken(app)}` },
      payload: { slotIds: ['not-a-uuid'] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/layouts/${LAYOUT_ID}/slots/reorder`,
      payload: { slotIds: [SLOT_1] },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when user lacks permission', async () => {
    const restricted = await buildApp(false);
    const res = await restricted.inject({
      method: 'PATCH',
      url: `/layouts/${LAYOUT_ID}/slots/reorder`,
      headers: { authorization: `Bearer ${signToken(restricted)}` },
      payload: { slotIds: [SLOT_1] },
    });
    await restricted.close();
    expect(res.statusCode).toBe(403);
  });
});
