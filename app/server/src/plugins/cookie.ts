import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'

export default fp(async function cookiePlugin(fastify: FastifyInstance) {
  if (!process.env.COOKIE_SECRET) {
    throw new Error('COOKIE_SECRET is not set')
  }
  fastify.register(cookie, { secret: process.env.COOKIE_SECRET })
})
