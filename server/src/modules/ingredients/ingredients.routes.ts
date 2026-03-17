import { FastifyInstance } from 'fastify';
import {
  ListIngredientsQuerySchema,
  CreateIngredientSchema,
  UpdateIngredientSchema,
  IngredientParamsSchema,
  MatchIngredientSchema,
  AddAliasSchema,
  AliasParamsSchema,
} from '@app/types/ingredients';
import {
  listIngredients,
  fetchIngredientById,
  matchIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  addAlias,
  removeAlias,
} from './ingredients.service';
import { PERMISSIONS } from '../../constants';

async function ingredientRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const query = ListIngredientsQuerySchema.parse(request.query);
    const result = await listIngredients(fastify.prisma, request.user.workspaceId, query);
    return { data: result };
  });

  // POST /match must be registered BEFORE /:id to avoid route param conflict
  fastify.post(
    '/match',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.INGREDIENTS.CREATE)],
    },
    async (request) => {
      const body = MatchIngredientSchema.parse(request.body);
      const result = await matchIngredient(fastify.prisma, body.name, request.user.workspaceId);
      return { data: result };
    },
  );

  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.INGREDIENTS.CREATE)],
    },
    async (request, reply) => {
      const body = CreateIngredientSchema.parse(request.body);
      const result = await createIngredient(fastify.prisma, body, request.user.workspaceId);
      return reply.status(201).send({ data: result });
    },
  );

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request) => {
    const params = IngredientParamsSchema.parse(request.params);
    const result = await fetchIngredientById(fastify.prisma, params.id, request.user.workspaceId);
    return { data: result };
  });

  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.INGREDIENTS.UPDATE)],
    },
    async (request) => {
      const params = IngredientParamsSchema.parse(request.params);
      const body = UpdateIngredientSchema.parse(request.body);
      const result = await updateIngredient(
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
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.INGREDIENTS.DELETE)],
    },
    async (request) => {
      const params = IngredientParamsSchema.parse(request.params);
      const result = await deleteIngredient(fastify.prisma, params.id, request.user.workspaceId);
      return { data: result };
    },
  );

  fastify.post(
    '/:id/aliases',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.INGREDIENTS.UPDATE)],
    },
    async (request, reply) => {
      const params = IngredientParamsSchema.parse(request.params);
      const body = AddAliasSchema.parse(request.body);
      const result = await addAlias(
        fastify.prisma,
        params.id,
        request.user.workspaceId,
        body.alias,
      );
      return reply.status(201).send({ data: result });
    },
  );

  fastify.delete(
    '/:id/aliases/:aliasId',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.INGREDIENTS.DELETE)],
    },
    async (request) => {
      const params = AliasParamsSchema.parse(request.params);
      const result = await removeAlias(
        fastify.prisma,
        params.id,
        params.aliasId,
        request.user.workspaceId,
      );
      return { data: result };
    },
  );
}

export default ingredientRoutes;
