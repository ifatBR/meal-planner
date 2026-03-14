import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  findUserByEmail, findUserById, findRefreshTokenByHash,
  createRefreshToken, revokeRefreshToken, deleteAllUserRefreshTokens,
} from '../auth.repository'

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_TEST_URL } },
})

beforeEach(async () => {
  await prisma.refreshToken.deleteMany()
  await prisma.workspaceUser.deleteMany()
  await prisma.user.deleteMany()
})

const createUser = (overrides = {}) =>
  prisma.user.create({
    data: {
      username: 'testuser', email: 'test@test.com',
      first_name: 'Test', last_name: 'User',
      password_hash: 'hash', active: true,
      ...overrides,
    },
  })

describe('findUserByEmail', () => {
  it('returns user when found', async () => {
    const user = await createUser()
    const result = await findUserByEmail(prisma, 'test@test.com')
    expect(result?.id).toBe(user.id)
  })

  it('returns null for unknown email', async () => {
    expect(await findUserByEmail(prisma, 'missing@test.com')).toBeNull()
  })
})

describe('findUserById', () => {
  it('returns user by id', async () => {
    const user = await createUser()
    expect((await findUserById(prisma, user.id))?.email).toBe('test@test.com')
  })

  it('returns null for unknown id', async () => {
    expect(await findUserById(prisma, '00000000-0000-0000-0000-000000000000')).toBeNull()
  })
})

describe('createRefreshToken and findRefreshTokenByHash', () => {
  it('creates and retrieves a refresh token by hash', async () => {
    const user = await createUser()
    await createRefreshToken(prisma, {
      user_id: user.id, token_hash: 'myhash',
      ip_address: '127.0.0.1', device: 'Mozilla/5.0',
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    })
    const result = await findRefreshTokenByHash(prisma, 'myhash')
    expect(result?.user_id).toBe(user.id)
    expect(result?.revoked_at).toBeNull()
  })
})

describe('revokeRefreshToken', () => {
  it('sets revoked_at on the record', async () => {
    const user = await createUser()
    const token = await prisma.refreshToken.create({
      data: { user_id: user.id, token_hash: 'h1', expires_at: new Date(Date.now() + 60_000) },
    })
    await revokeRefreshToken(prisma, token.id)
    const updated = await prisma.refreshToken.findUnique({ where: { id: token.id } })
    expect(updated?.revoked_at).not.toBeNull()
  })
})

describe('deleteAllUserRefreshTokens', () => {
  it('removes all tokens for the user', async () => {
    const user = await createUser()
    await prisma.refreshToken.createMany({
      data: [
        { user_id: user.id, token_hash: 'h2', expires_at: new Date() },
        { user_id: user.id, token_hash: 'h3', expires_at: new Date() },
      ],
    })
    await deleteAllUserRefreshTokens(prisma, user.id)
    const remaining = await prisma.refreshToken.findMany({ where: { user_id: user.id } })
    expect(remaining).toHaveLength(0)
  })
})
