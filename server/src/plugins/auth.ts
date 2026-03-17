import fp from 'fastify-plugin';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { Role } from '@app/types/roles';
import { forbiddenError } from '../utils/errors';

export type JWTPayload = {
  userId: string;
  workspaceId: string;
  role: Role;
};

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

type Permission = { domain: string; key: string };

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePermission: (permission: Permission) => (request: FastifyRequest) => Promise<void>;
  }
}

export default fp(async function authPlugin(fastify: FastifyInstance) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  await fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET! });
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.decorate(
    'requirePermission',
    (permission: Permission) => async (request: FastifyRequest) => {
      const found = await fastify.prisma.permission.findFirst({
        where: {
          domain: permission.domain,
          key: permission.key,
          roles_permissions: {
            some: {
              role: { key: request.user.role },
            },
          },
        },
      });
      if (!found) throw forbiddenError();
    },
  );
});
