import { FastifyInstance } from 'fastify';
import { LoginSchema, RefreshSchema, LogoutSchema } from '@app/types/auth';
import {
  loginUser,
  refreshAccessToken,
  logoutUser,
  logoutAllSessions,
  getAuthenticatedUser,
} from './auth.service';
import { refreshCookieOptions, REFRESH_TOKEN_COOKIE } from './auth.domain';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../constants';

async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    const result = await loginUser(
      fastify.prisma,
      (payload, opts) => fastify.jwt.sign(payload, opts),
      body,
      {
        ipAddress: request.ip ?? null,
        device: (request.headers['user-agent'] as string) ?? null,
      },
    );
    reply.setCookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      refreshCookieOptions(result.ttlDays),
    );
    return reply.status(200).send({
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  });

  fastify.post('/refresh', async (request, reply) => {
    const body = RefreshSchema.parse(request.body ?? {});
    const rawToken = request.cookies[REFRESH_TOKEN_COOKIE] ?? body.refreshToken;
    if (!rawToken) {
      return reply.status(HTTP_STATUS.UNAUTHORIZED).send({
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES.UNAUTHORIZED,
      });
    }
    const result = await refreshAccessToken(
      fastify.prisma,
      (payload, opts) => fastify.jwt.sign(payload, opts),
      rawToken,
    );
    reply.setCookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      refreshCookieOptions(result.ttlDays),
    );
    return {
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  });

  fastify.post('/logout', async (request, reply) => {
    const body = LogoutSchema.parse(request.body ?? {});
    const rawToken = request.cookies[REFRESH_TOKEN_COOKIE] ?? body.refreshToken;
    if (rawToken) await logoutUser(fastify.prisma, rawToken);
    reply.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
    return { data: { success: true } };
  });

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const user = await getAuthenticatedUser(fastify.prisma, request.user.userId);
    return { data: { user } };
  });

  fastify.post('/logout-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    await logoutAllSessions(fastify.prisma, request.user.userId);
    reply.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
    return { data: { success: true } };
  });
}

export default authRoutes;
