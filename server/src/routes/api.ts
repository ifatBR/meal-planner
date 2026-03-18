import { FastifyInstance } from 'fastify';
import authRoutes from '@modules/auth/auth.routes';
import ingredientRoutes from '@modules/ingredients/ingredients.routes';
import dishTypeRoutes from '@modules/dish-types/dish-types.routes';

async function apiRoutes(fastify: FastifyInstance) {
  fastify.register(ingredientRoutes, { prefix: '/ingredients' });
  fastify.register(dishTypeRoutes, { prefix: '/dish-types' });
  fastify.register(authRoutes, { prefix: '/auth' });
}

export default apiRoutes;
