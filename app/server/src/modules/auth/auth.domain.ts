import crypto from 'crypto'

export const ACCESS_TOKEN_TTL = '15m' as const

export const REFRESH_TTL_DAYS = {
  rememberMe: 90,
  default: 30,
} as const

export const REFRESH_TOKEN_COOKIE = 'refreshToken' as const

export function getRefreshTtlDays(rememberMe = false): number {
  return rememberMe ? REFRESH_TTL_DAYS.rememberMe : REFRESH_TTL_DAYS.default
}

export function getRefreshExpiresAt(ttlDays: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + ttlDays)
  return d
}

export function isTokenExpired(expiresAt: Date): boolean {
  return expiresAt < new Date()
}

export function isTokenRevoked(revokedAt: Date | null): boolean {
  return revokedAt !== null
}

export function canUseToken(token: { expires_at: Date; revoked_at: Date | null }): boolean {
  return !isTokenExpired(token.expires_at) && !isTokenRevoked(token.revoked_at)
}

export function generateRawRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

// Infer original TTL from the stored record to preserve rememberMe intent on rotation
export function inferTtlDaysFromRecord(createdAt: Date, expiresAt: Date): number {
  const originalTtlDays = Math.round(
    (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  return originalTtlDays >= REFRESH_TTL_DAYS.rememberMe
    ? REFRESH_TTL_DAYS.rememberMe
    : REFRESH_TTL_DAYS.default
}

export function refreshCookieOptions(ttlDays: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: ttlDays * 24 * 60 * 60,
  }
}
