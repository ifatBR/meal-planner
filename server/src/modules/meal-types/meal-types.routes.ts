import { FastifyInstance } from 'fastify';
import {
  CreateMealTypeSchema,
  UpdateMealTypeSchema,
  MealTypeParamsSchema,
} from '@app/types/meal-types';
import {
  listMealTypes,
  createMealType,
  updateMealType,
  deleteMealType,
} from './meal-types.service';
import { PERMISSIONS } from '../../constants';

async function mealTypeRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const result = await listMealTypes(fastify.prisma, request.user.workspaceId);
    return { data: result };
  });

  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.MEAL_TYPES.CREATE)],
    },
    async (request, reply) => {
      const body = CreateMealTypeSchema.parse(request.body);
      const result = await createMealType(fastify.prisma, body, request.user.workspaceId);
      return reply.status(201).send({ data: result });
    },
  );

  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.MEAL_TYPES.UPDATE)],
    },
    async (request) => {
      const params = MealTypeParamsSchema.parse(request.params);
      const body = UpdateMealTypeSchema.parse(request.body);
      const result = await updateMealType(
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
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.MEAL_TYPES.DELETE)],
    },
    async (request) => {
      const params = MealTypeParamsSchema.parse(request.params);
      const result = await deleteMealType(fastify.prisma, params.id, request.user.workspaceId);
      return { data: result };
    },
  );
}

export default mealTypeRoutes;
