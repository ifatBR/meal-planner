import { PrismaClient } from '@prisma/client'

export const findUserByEmail = (prisma: PrismaClient, email: string) =>
  prisma.user.findUnique({ where: { email } })

export const findUserById = (prisma: PrismaClient, id: string) =>
  prisma.user.findUnique({ where: { id } })

export const findUserWithFirstWorkspace = (prisma: PrismaClient, userId: string) =>
  prisma.workspaceUser.findFirst({
    where: { user_id: userId },
    include: { role: true },
    orderBy: { created_at: 'asc' },
  })

export const findRefreshTokenByHash = (prisma: PrismaClient, tokenHash: string) =>
  prisma.refreshToken.findUnique({ where: { token_hash: tokenHash } })

export const createRefreshToken = (
  prisma: PrismaClient,
  data: {
    user_id: string
    token_hash: string
    ip_address: string | null
    device: string | null
    expires_at: Date
  }
) => prisma.refreshToken.create({ data })

export const revokeRefreshToken = (prisma: PrismaClient, id: string) =>
  prisma.refreshToken.update({
    where: { id },
    data: { revoked_at: new Date() },
  })

export const deleteAllUserRefreshTokens = (prisma: PrismaClient, userId: string) =>
  prisma.refreshToken.deleteMany({ where: { user_id: userId } })
