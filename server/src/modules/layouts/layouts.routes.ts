import { FastifyInstance } from 'fastify';
import { ReorderSlotsSchema, LayoutParamsSchema } from '@app/types/layouts';
import { reorderSlots } from './layouts.service';
import { PERMISSIONS } from '../../constants';

async function layoutRoutes(fastify: FastifyInstance) {
  fastify.patch(
    '/:layoutId/slots/reorder',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requirePermission(PERMISSIONS.SCHEDULES.UPDATE),
      ],
    },
    async (request) => {
      const params = LayoutParamsSchema.parse(request.params);
      const body = ReorderSlotsSchema.parse(request.body);
      const result = await reorderSlots(
        fastify.prisma,
        params.layoutId,
        request.user.workspaceId,
        body.slotIds,
      );
      return { data: result };
    },
  );
}

export default layoutRoutes;
