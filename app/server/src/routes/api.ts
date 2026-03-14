import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import authRoutes from '../modules/auth/auth.routes'

async function apiRoutes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: '/auth' })
}

export default fp(apiRoutes)
