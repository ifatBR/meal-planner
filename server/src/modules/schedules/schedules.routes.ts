import { FastifyInstance } from 'fastify';
import {
  ScheduleParamsSchema,
  ListSchedulesQuerySchema,
  CreateScheduleBodySchema,
  UpdateScheduleBodySchema,
  CalendarQuerySchema,
  GenerateScheduleBodySchema,
} from '@app/types/schedules';
import {
  listSchedules,
  fetchScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  fetchScheduleSettings,
  fetchScheduleCalendar,
  generateScheduleService,
} from './schedules.service';
import { PERMISSIONS } from '../../constants';

type ScheduleRow = Awaited<ReturnType<typeof fetchScheduleById>>;
type MealRecipeRow = {
  id: string;
  recipe_id: string;
  dish_type_id: string;
  recipe: { name: string };
  dish_type: { id: string; name: string };
};
type MealRow = {
  id: string;
  meal_type_id: string;
  is_locked: boolean;
  is_manually_edited: boolean;
  meal_type: { id: string; name: string };
  meal_recipes: MealRecipeRow[];
};

const mapSchedule = (s: ScheduleRow) => ({
  id: s.id,
  name: s.name,
  layoutId: s.layout_id,
  startDate: s.start_date.toISOString().split('T')[0],
  endDate: s.end_date.toISOString().split('T')[0],
  createdAt: s.created_at,
  updatedAt: s.updated_at,
});

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

const mapCalendarDay = (day: {
  id: string | null;
  date: string;
  meals: MealRow[];
}) => ({
  id: day.id,
  date: day.date,
  meals: day.meals.map(mapMeal),
});

async function scheduleRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const query = ListSchedulesQuerySchema.parse(request.query);
    const { workspaceId } = request.user;
    const result = await listSchedules(fastify.prisma, workspaceId, query);
    return {
      data: {
        items: result.items.map(mapSchedule),
        meta: result.meta,
      },
    };
  });

  fastify.post(
    '/',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requirePermission(PERMISSIONS.SCHEDULES.CREATE),
      ],
    },
    async (request, reply) => {
      const body = CreateScheduleBodySchema.parse(request.body);
      const { workspaceId } = request.user;
      const schedule = await createSchedule(fastify.prisma, workspaceId, body);
      return reply.status(201).send({ data: mapSchedule(schedule) });
    },
  );

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request) => {
    const params = ScheduleParamsSchema.parse(request.params);
    const { workspaceId } = request.user;
    const schedule = await fetchScheduleById(fastify.prisma, params.id, workspaceId);
    return { data: mapSchedule(schedule) };
  });

  fastify.patch(
    '/:id',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requirePermission(PERMISSIONS.SCHEDULES.UPDATE),
      ],
    },
    async (request) => {
      const params = ScheduleParamsSchema.parse(request.params);
      const body = UpdateScheduleBodySchema.parse(request.body);
      const { workspaceId } = request.user;
      const schedule = await updateSchedule(fastify.prisma, params.id, workspaceId, body);
      return { data: mapSchedule(schedule) };
    },
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requirePermission(PERMISSIONS.SCHEDULES.DELETE),
      ],
    },
    async (request) => {
      const params = ScheduleParamsSchema.parse(request.params);
      const { workspaceId } = request.user;
      const result = await deleteSchedule(fastify.prisma, params.id, workspaceId);
      return { data: result };
    },
  );

  fastify.get(
    '/:id/settings',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const params = ScheduleParamsSchema.parse(request.params);
      const { workspaceId } = request.user;
      const settings = await fetchScheduleSettings(fastify.prisma, params.id, workspaceId);

      // Group blocked meals by date
      const blockedMealsMap = new Map<string, string[]>();
      for (const bm of settings.blocked_meals) {
        const dateStr = bm.date.toISOString().split('T')[0];
        if (!blockedMealsMap.has(dateStr)) blockedMealsMap.set(dateStr, []);
        blockedMealsMap.get(dateStr)!.push(bm.meal_type_id);
      }

      return {
        data: {
          recipeGap: settings.recipe_gap,
          mainIngGap: settings.main_ing_gap,
          isAllowSameDayIng: settings.is_allow_same_day_ing,
          blockedMeals: Array.from(blockedMealsMap.entries()).map(([date, mealTypeIds]) => ({
            date,
            mealTypeIds,
          })),
        },
      };
    },
  );

  fastify.get(
    '/:id/calendar',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const params = ScheduleParamsSchema.parse(request.params);
      const query = CalendarQuerySchema.parse(request.query);
      const { workspaceId } = request.user;
      const result = await fetchScheduleCalendar(
        fastify.prisma,
        params.id,
        workspaceId,
        query.anchorDate,
      );
      return {
        data: {
          anchorDate: result.anchorDate,
          days: result.days.map(mapCalendarDay),
        },
      };
    },
  );

  fastify.post(
    '/:id/generate',
    {
      preHandler: [
        fastify.authenticate,
        fastify.requirePermission(PERMISSIONS.SCHEDULES.UPDATE),
      ],
    },
    async (request) => {
      const params = ScheduleParamsSchema.parse(request.params);
      const body = GenerateScheduleBodySchema.parse(request.body);
      const { workspaceId } = request.user;
      const result = await generateScheduleService(
        fastify.prisma,
        params.id,
        workspaceId,
        body,
      );
      return {
        data: {
          schedule: mapSchedule(result.schedule),
          settings: result.settings,
          calendar: {
            anchorDate: result.calendar.anchorDate,
            days: result.calendar.days.map(mapCalendarDay),
          },
          generationSummary: result.generationSummary,
          warnings: result.warnings,
        },
      };
    },
  );
}

export default scheduleRoutes;
