import 'dotenv/config';
import Fastify from 'fastify';
import errorHandler from './plugins/errorHandler';
import cookiePlugin from './plugins/cookie';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import healthRoutes from './routes/health';
import apiRoutes from './routes/api';

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
    routerOptions: { ignoreTrailingSlash: true },
  });

  fastify.register(errorHandler);
  fastify.register(cookiePlugin);
  fastify.register(prismaPlugin);
  fastify.register(authPlugin);
  fastify.register(healthRoutes, { prefix: '/health' });
  fastify.register(apiRoutes, { prefix: '/api/v1' });

  return fastify;
}
