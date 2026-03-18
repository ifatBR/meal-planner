import { FastifyInstance } from 'fastify';
import {
  ListIngredientsQuerySchema,
  CreateIngredientSchema,
  UpdateIngredientSchema,
  IngredientParamsSchema,
  MatchIngredientSchema,
  AddVariantSchema,
  VariantParamsSchema,
} from '@app/types/ingredients';
import {
  listIngredients,
  fetchIngredientById,
  matchIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  addVariant,
  removeVariant,
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
      console.log('request.params:', request.params);
      const params = IngredientParamsSchema.parse(request.params);
      console.log('params:', params);
      const result = await deleteIngredient(fastify.prisma, params.id, request.user.workspaceId);
      return { data: result };
    },
  );

  fastify.post(
    '/:id/variants',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.INGREDIENTS.UPDATE)],
    },
    async (request, reply) => {
      const params = IngredientParamsSchema.parse(request.params);
      const body = AddVariantSchema.parse(request.body);
      const result = await addVariant(
        fastify.prisma,
        params.id,
        request.user.workspaceId,
        body.variant,
      );
      return reply.status(201).send({ data: result });
    },
  );

  fastify.delete(
    '/:id/variants/:variantId',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.INGREDIENTS.DELETE)],
    },
    async (request) => {
      const params = VariantParamsSchema.parse(request.params);
      const result = await removeVariant(
        fastify.prisma,
        params.id,
        params.variantId,
        request.user.workspaceId,
      );
      return { data: result };
    },
  );
}

export default ingredientRoutes;
