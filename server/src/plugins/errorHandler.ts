import fp from 'fastify-plugin';
import { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export default fp(async function errorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError | ZodError | Error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        issues: error.issues,
      });
    }

    // ZodError that was wrapped by Fastify
    if (error.message.startsWith('[') || error.cause instanceof ZodError) {
      const issues =
        error.cause instanceof ZodError ? error.cause.issues : JSON.parse(error.message);
      return reply.status(400).send({
        error: 'Validation Error',
        issues,
      });
    }

    if ('statusCode' in error && error.statusCode) {
      return reply.status(error.statusCode as number).send({ error: error.message });
    }

    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal Server Error' });
  });
});
