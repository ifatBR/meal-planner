import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import {
  findUserByEmail,
  findUserById,
  findUserWithFirstWorkspace,
  findRefreshTokenByHash,
  createRefreshToken,
  revokeRefreshToken,
  deleteAllUserRefreshTokens,
} from './auth.repository';
import {
  ACCESS_TOKEN_TTL,
  canUseToken,
  generateRawRefreshToken,
  getRefreshExpiresAt,
  getRefreshTtlDays,
  inferTtlDaysFromRecord,
  hashRefreshToken,
} from './auth.domain';
import { JWTPayload } from '../../plugins/auth';
import { Role } from '@app/types/roles';
import { notFoundError, unAuthorizedError } from '../../utils/errors';

type SignFn = (payload: JWTPayload, options: { expiresIn: string }) => string;

const unauthorized = () => unAuthorizedError();

export const loginUser = async (
  prisma: PrismaClient,
  sign: SignFn,
  input: { email: string; password: string; rememberMe?: boolean },
  meta: { ipAddress: string | null; device: string | null },
) => {
  const user = await findUserByEmail(prisma, input.email);
  if (!user || !user.active) throw unauthorized();

  const passwordValid = await argon2.verify(user.password_hash, input.password);
  if (!passwordValid) throw unauthorized();

  const workspaceUser = await findUserWithFirstWorkspace(prisma, user.id);
  if (!workspaceUser) throw unauthorized();

  const accessToken = sign(
    {
      userId: user.id,
      workspaceId: workspaceUser.workspace_id,
      role: workspaceUser.role.key as Role,
    },
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  const ttlDays = getRefreshTtlDays(input.rememberMe);
  const rawToken = generateRawRefreshToken();

  await createRefreshToken(prisma, {
    user_id: user.id,
    token_hash: hashRefreshToken(rawToken),
    ip_address: meta.ipAddress,
    device: meta.device,
    expires_at: getRefreshExpiresAt(ttlDays),
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      userName: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
    },
    accessToken,
    refreshToken: rawToken,
    ttlDays,
  };
};

export const refreshAccessToken = async (prisma: PrismaClient, sign: SignFn, rawToken: string) => {
  const existing = await findRefreshTokenByHash(prisma, hashRefreshToken(rawToken));
  if (!existing || !canUseToken(existing)) throw unauthorized();

  const workspaceUser = await findUserWithFirstWorkspace(prisma, existing.user_id);
  if (!workspaceUser) throw unauthorized();

  const accessToken = sign(
    {
      userId: existing.user_id,
      workspaceId: workspaceUser.workspace_id,
      role: workspaceUser.role.key as Role,
    },
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  const ttlDays = inferTtlDaysFromRecord(existing.created_at, existing.expires_at);
  const newRawToken = generateRawRefreshToken();

  await revokeRefreshToken(prisma, existing.id);
  await createRefreshToken(prisma, {
    user_id: existing.user_id,
    token_hash: hashRefreshToken(newRawToken),
    ip_address: existing.ip_address,
    device: existing.device,
    expires_at: getRefreshExpiresAt(ttlDays),
  });

  return { accessToken, refreshToken: newRawToken, ttlDays };
};

export const logoutUser = async (prisma: PrismaClient, rawToken: string) => {
  const existing = await findRefreshTokenByHash(prisma, hashRefreshToken(rawToken));
  if (existing && !existing.revoked_at) {
    await revokeRefreshToken(prisma, existing.id);
  }
};

export const logoutAllSessions = async (prisma: PrismaClient, userId: string) => {
  await deleteAllUserRefreshTokens(prisma, userId);
};

export const getAuthenticatedUser = async (prisma: PrismaClient, userId: string) => {
  const user = await findUserById(prisma, userId);
  if (!user) {
    throw notFoundError();
  }
  return {
    id: user.id,
    email: user.email,
    userName: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
  };
};
