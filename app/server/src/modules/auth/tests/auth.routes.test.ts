import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import authPlugin from '../../../plugins/auth'
import authRoutes from '../auth.routes'
import * as service from '../auth.service'

vi.mock('../auth.service')

const buildApp = async () => {
  const app = Fastify()
  await app.register(cookie, { secret: 'test-secret' })
  await app.register(authPlugin)
  await app.register(authRoutes)
  await app.ready()
  return app
}

const signToken = (app: Awaited<ReturnType<typeof buildApp>>) =>
  app.jwt.sign({ userId: 'user-1', workspaceId: 'ws-1', role: 'admin' })

const mockUserResult = {
  user: { id: 'u1', email: 'a@test.com', userName: 'user1', firstName: 'John', lastName: 'Doe' },
  accessToken: 'access-token',
  refreshToken: 'a'.repeat(64),
  ttlDays: 30,
}

describe('POST /login', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  beforeEach(async () => { app = await buildApp() })
  afterEach(async () => { await app.close() })

  it('returns 200 with user, accessToken, and refreshToken', async () => {
    vi.mocked(service.loginUser).mockResolvedValue(mockUserResult)
    const res = await app.inject({
      method: 'POST', url: '/login',
      body: { email: 'a@test.com', password: 'password123' },
    })
    expect(res.statusCode).toBe(200)
    const json = res.json()
    expect(json.data.user.email).toBe('a@test.com')
    expect(json.data.accessToken).toBe('access-token')
    expect(json.data.refreshToken).toBeDefined()
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('returns 400 for invalid body (bad email)', async () => {
    const res = await app.inject({
      method: 'POST', url: '/login',
      body: { email: 'not-an-email', password: 'password123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for password too short', async () => {
    const res = await app.inject({
      method: 'POST', url: '/login',
      body: { email: 'a@test.com', password: 'short' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /refresh', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  beforeEach(async () => { app = await buildApp() })
  afterEach(async () => { await app.close() })

  it('returns 200 with new tokens when body refreshToken provided', async () => {
    vi.mocked(service.refreshAccessToken).mockResolvedValue({
      accessToken: 'new-access', refreshToken: 'b'.repeat(64), ttlDays: 30,
    })
    const res = await app.inject({
      method: 'POST', url: '/refresh',
      body: { refreshToken: 'a'.repeat(64) },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.accessToken).toBe('new-access')
  })

  it('returns 401 when no token provided', async () => {
    const res = await app.inject({ method: 'POST', url: '/refresh', body: {} })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /logout', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  beforeEach(async () => { app = await buildApp() })
  afterEach(async () => { await app.close() })

  it('always returns 200 even with no token', async () => {
    vi.mocked(service.logoutUser).mockResolvedValue(undefined)
    const res = await app.inject({ method: 'POST', url: '/logout', body: {} })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.success).toBe(true)
  })
})

describe('GET /me', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  beforeEach(async () => { app = await buildApp() })
  afterEach(async () => { await app.close() })

  it('returns 200 with user when authenticated', async () => {
    vi.mocked(service.getAuthenticatedUser).mockResolvedValue(mockUserResult.user)
    const res = await app.inject({
      method: 'GET', url: '/me',
      headers: { authorization: `Bearer ${signToken(app)}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.user.email).toBe('a@test.com')
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/me' })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /logout-all', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  beforeEach(async () => { app = await buildApp() })
  afterEach(async () => { await app.close() })

  it('returns 200 when authenticated', async () => {
    vi.mocked(service.logoutAllSessions).mockResolvedValue(undefined)
    const res = await app.inject({
      method: 'POST', url: '/logout-all',
      headers: { authorization: `Bearer ${signToken(app)}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.success).toBe(true)
  })

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'POST', url: '/logout-all' })
    expect(res.statusCode).toBe(401)
  })
})
