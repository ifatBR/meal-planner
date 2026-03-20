import { FastifyInstance } from 'fastify';
import {
  ListRecipesQuerySchema,
  GetRecipeParamsSchema,
  CreateRecipeBodySchema,
  UpdateRecipeParamsSchema,
  UpdateRecipeBodySchema,
  DeleteRecipeParamsSchema,
} from '@app/types/recipes';
import {
  listRecipes,
  fetchRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from './recipes.service';
import { ScheduleConflictError } from '../../utils/errors';
import { PERMISSIONS } from '../../constants';

type RIRow = {
  id: string;
  is_main: boolean;
  display_name: string | null;
  amount: number | null;
  ingredient: { id: string; name: string };
  unit: { name: string } | null;
};

type RecipeRow = {
  id: string;
  name: string;
  instructions: string | null;
  recipe_dish_types: { dish_type: { id: string; name: string } }[];
  recipe_meal_types: { meal_type: { id: string; name: string } }[];
  recipe_ingredients: RIRow[];
};

const mapIngredient = (ri: RIRow) => ({
  id: ri.id,
  displayName: ri.display_name ?? ri.ingredient.name,
  isMain: ri.is_main,
  ...(ri.amount != null && ri.unit != null && {
    measure: { amount: ri.amount, unit: ri.unit.name },
  }),
});

const mapRecipeList = (recipe: RecipeRow) => ({
  id: recipe.id,
  name: recipe.name,
  dishTypes: recipe.recipe_dish_types.map((rdt) => rdt.dish_type),
  mealTypes: recipe.recipe_meal_types.map((rmt) => rmt.meal_type),
  ingredients: recipe.recipe_ingredients.map(mapIngredient),
});

const mapRecipeDetail = (recipe: RecipeRow) => ({
  ...mapRecipeList(recipe),
  ...(recipe.instructions != null && { instructions: recipe.instructions }),
});

async function recipeRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const query = ListRecipesQuerySchema.parse(request.query);
    const { items, meta } = await listRecipes(fastify.prisma, request.user.workspaceId, query);
    return { data: { items: items.map(mapRecipeList), meta } };
  });

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request) => {
    const params = GetRecipeParamsSchema.parse(request.params);
    const result = await fetchRecipeById(fastify.prisma, params.id, request.user.workspaceId);
    return { data: mapRecipeDetail(result) };
  });

  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.RECIPES.CREATE)],
    },
    async (request, reply) => {
      const body = CreateRecipeBodySchema.parse(request.body);
      const result = await createRecipe(fastify.prisma, request.user.workspaceId, body);
      return reply.status(201).send({ data: mapRecipeDetail(result) });
    },
  );

  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.RECIPES.UPDATE)],
    },
    async (request, reply) => {
      const params = UpdateRecipeParamsSchema.parse(request.params);
      const body = UpdateRecipeBodySchema.parse(request.body);
      try {
        const result = await updateRecipe(
          fastify.prisma,
          params.id,
          request.user.workspaceId,
          body,
        );
        return { data: mapRecipeDetail(result) };
      } catch (err) {
        if (err instanceof ScheduleConflictError) {
          return reply.status(409).send({
            statusCode: 409,
            error: err.errorCode,
            message: err.message,
            affected_schedules: err.affectedSchedules,
          });
        }
        throw err;
      }
    },
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.RECIPES.DELETE)],
    },
    async (request, reply) => {
      const params = DeleteRecipeParamsSchema.parse(request.params);
      try {
        const result = await deleteRecipe(fastify.prisma, params.id, request.user.workspaceId);
        return { data: result };
      } catch (err) {
        if (err instanceof ScheduleConflictError) {
          return reply.status(409).send({
            statusCode: 409,
            error: err.errorCode,
            message: err.message,
            affected_schedules: err.affectedSchedules,
          });
        }
        throw err;
      }
    },
  );
}

export default recipeRoutes;
