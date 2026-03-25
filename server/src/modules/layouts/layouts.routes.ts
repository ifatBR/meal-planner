import { FastifyInstance } from 'fastify';
import {
  LayoutParamsSchema,
  LayoutQuerySchema,
  CreateLayoutBodySchema,
  UpdateLayoutBodySchema,
  CloneLayoutBodySchema,
} from '@app/types/layouts';
import {
  listLayouts,
  fetchLayoutById,
  createLayout,
  updateLayout,
  cloneLayout,
  deleteLayout,
} from './layouts.service';
import { PERMISSIONS } from '../../constants';
import { LayoutConflictError } from '../../utils/errors';

type ListRow = Awaited<ReturnType<typeof listLayouts>>[number];
type DetailRow = Awaited<ReturnType<typeof fetchLayoutById>>;
type UpdateRow = Awaited<ReturnType<typeof updateLayout>>;
type SummaryRow = Awaited<ReturnType<typeof createLayout>>;

const mapListItem = (layout: ListRow) => ({
  id: layout.id,
  name: layout.name,
  inUse: layout._count.schedules > 0,
  createdAt: layout.created_at,
  updatedAt: layout.updated_at,
});

const mapDetail = (layout: DetailRow) => ({
  id: layout.id,
  name: layout.name,
  inUse: layout.schedules.length > 0,
  usedBySchedules: layout.schedules,
  weekDaysLayouts: layout.week_days_layouts.map((wdl) => ({
    id: wdl.id,
    days: wdl.days,
    mealSlots: wdl.meal_slots.map((slot) => ({
      id: slot.id,
      order: slot.order,
      mealType: { id: slot.meal_type.id, name: slot.meal_type.name },
      dishAllocations: slot.dish_allocations.map((da) => ({
        id: da.id,
        dishType: { id: da.dish_type.id, name: da.dish_type.name },
        amount: da.amount,
      })),
    })),
  })),
});

const mapSummary = (layout: SummaryRow) => ({
  id: layout.id,
  name: layout.name,
  inUse: false as const,
  usedBySchedules: [] as Array<{ id: string; name: string }>,
  createdAt: layout.created_at,
  updatedAt: layout.updated_at,
});

const mapUpdate = (layout: UpdateRow) => ({
  id: layout.id,
  name: layout.name,
  inUse: layout.schedules.length > 0,
  usedBySchedules: layout.schedules,
  updatedAt: layout.updated_at,
});

async function layoutRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { workspaceId } = request.user;
    const items = await listLayouts(fastify.prisma, workspaceId);
    return { data: { items: items.map(mapListItem) } };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const params = LayoutParamsSchema.parse(request.params);
    const { workspaceId } = request.user;
    const layout = await fetchLayoutById(fastify.prisma, params.id, workspaceId);
    return reply.send({ data: mapDetail(layout) });
  });

  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.LAYOUTS.CREATE)],
    },
    async (request, reply) => {
      const body = CreateLayoutBodySchema.parse(request.body);
      const { workspaceId } = request.user;
      const layout = await createLayout(fastify.prisma, workspaceId, body);
      return reply.code(201).send({ data: mapSummary(layout) });
    },
  );

  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.LAYOUTS.UPDATE)],
    },
    async (request, reply) => {
      const params = LayoutParamsSchema.parse(request.params);
      const query = LayoutQuerySchema.parse(request.query);
      const body = UpdateLayoutBodySchema.parse(request.body);
      const { workspaceId } = request.user;

      try {
        const layout = await updateLayout(
          fastify.prisma,
          params.id,
          workspaceId,
          body,
          query.scheduleId,
        );
        return reply.send({ data: mapUpdate(layout) });
      } catch (err) {
        if (err instanceof LayoutConflictError) {
          return reply.status(409).send({
            statusCode: 409,
            error: err.errorCode,
            message: err.message,
            usedBySchedules: err.usedBySchedules,
          });
        }
        throw err;
      }
    },
  );

  fastify.post(
    '/:id/clone',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.LAYOUTS.CREATE)],
    },
    async (request, reply) => {
      const params = LayoutParamsSchema.parse(request.params);
      const body = CloneLayoutBodySchema.parse(request.body);
      const { workspaceId } = request.user;
      const layout = await cloneLayout(fastify.prisma, params.id, workspaceId, body.name);
      return reply.code(201).send({ data: mapSummary(layout) });
    },
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.LAYOUTS.DELETE)],
    },
    async (request, reply) => {
      const params = LayoutParamsSchema.parse(request.params);
      const query = LayoutQuerySchema.parse(request.query);
      const { workspaceId } = request.user;

      try {
        const result = await deleteLayout(
          fastify.prisma,
          params.id,
          workspaceId,
          query.scheduleId,
        );
        return reply.send({ data: result });
      } catch (err) {
        if (err instanceof LayoutConflictError) {
          return reply.status(409).send({
            statusCode: 409,
            error: err.errorCode,
            message: err.message,
            usedBySchedules: err.usedBySchedules,
          });
        }
        throw err;
      }
    },
  );
}

export default layoutRoutes;
