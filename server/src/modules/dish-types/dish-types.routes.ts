import { FastifyInstance } from 'fastify';
import {
  CreateDishTypeSchema,
  UpdateDishTypeSchema,
  DishTypeParamsSchema,
} from '@app/types/dish-types';
import {
  listDishTypes,
  createDishType,
  updateDishType,
  deleteDishType,
} from './dish-types.service';
import { PERMISSIONS } from '../../constants';

async function dishTypeRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const result = await listDishTypes(fastify.prisma, request.user.workspaceId);
    return { data: result };
  });

  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.DISH_TYPES.CREATE)],
    },
    async (request, reply) => {
      const body = CreateDishTypeSchema.parse(request.body);
      const result = await createDishType(fastify.prisma, body, request.user.workspaceId);
      return reply.status(201).send({ data: result });
    },
  );

  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.DISH_TYPES.UPDATE)],
    },
    async (request) => {
      const params = DishTypeParamsSchema.parse(request.params);
      const body = UpdateDishTypeSchema.parse(request.body);
      const result = await updateDishType(
        fastify.prisma,
        params.id,
        request.user.workspaceId,
        body,
      );
      return { data: result };
    },
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.DISH_TYPES.DELETE)],
    },
    async (request) => {
      const params = DishTypeParamsSchema.parse(request.params);
      const result = await deleteDishType(fastify.prisma, params.id, request.user.workspaceId);
      return { data: result };
    },
  );
}

export default dishTypeRoutes;
