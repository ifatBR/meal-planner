import { FastifyInstance } from 'fastify';
import { ScheduleMealParamsSchema, UpdateScheduleMealBodySchema } from '@app/types/schedule-meals';
import { patchScheduleMeal, clearScheduleMealRecipes } from './schedule-meals.service';
import { PERMISSIONS } from '../../constants';

type MealRow = Awaited<ReturnType<typeof patchScheduleMeal>>;

const mapMeal = (meal: MealRow) => ({
  id: meal.id,
  mealType: meal.meal_type,
  isLocked: meal.is_locked,
  isManuallyEdited: meal.is_manually_edited,
  recipes: meal.meal_recipes.map((mr) => ({
    recipeId: mr.recipe_id,
    recipeName: mr.recipe.name,
    dishType: mr.dish_type,
  })),
});

async function scheduleMealRoutes(fastify: FastifyInstance) {
  fastify.patch(
    '/:id',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requirePermission(PERMISSIONS.SCHEDULE_MEALS.UPDATE),
      ],
    },
    async (request) => {
      const params = ScheduleMealParamsSchema.parse(request.params);
      const body = UpdateScheduleMealBodySchema.parse(request.body);
      const { workspaceId } = request.user;
      const result = await patchScheduleMeal(fastify.prisma, params.id, workspaceId, body);
      return { data: mapMeal(result) };
    },
  );

  fastify.delete(
    '/:id/recipes',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requirePermission(PERMISSIONS.SCHEDULE_MEALS.DELETE),
      ],
    },
    async (request) => {
      const params = ScheduleMealParamsSchema.parse(request.params);
      const { workspaceId } = request.user;
      const result = await clearScheduleMealRecipes(fastify.prisma, params.id, workspaceId);
      return { data: mapMeal(result) };
    },
  );
}

export default scheduleMealRoutes;
