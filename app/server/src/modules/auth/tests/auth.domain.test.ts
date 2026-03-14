import { describe, it, expect } from 'vitest'
import {
  getRefreshTtlDays, isTokenExpired, isTokenRevoked, canUseToken,
  generateRawRefreshToken, hashRefreshToken, inferTtlDaysFromRecord,
  REFRESH_TTL_DAYS,
} from '../auth.domain'

describe('getRefreshTtlDays', () => {
  it('returns 90 when rememberMe is true', () =>
    expect(getRefreshTtlDays(true)).toBe(REFRESH_TTL_DAYS.rememberMe))
  it('returns 30 when rememberMe is false', () =>
    expect(getRefreshTtlDays(false)).toBe(REFRESH_TTL_DAYS.default))
  it('returns 30 when rememberMe is omitted', () =>
    expect(getRefreshTtlDays()).toBe(REFRESH_TTL_DAYS.default))
})

describe('isTokenExpired', () => {
  it('returns true for a past date', () =>
    expect(isTokenExpired(new Date(Date.now() - 1000))).toBe(true))
  it('returns false for a future date', () =>
    expect(isTokenExpired(new Date(Date.now() + 60_000))).toBe(false))
})

describe('isTokenRevoked', () => {
  it('returns true when revokedAt is set', () =>
    expect(isTokenRevoked(new Date())).toBe(true))
  it('returns false when revokedAt is null', () =>
    expect(isTokenRevoked(null)).toBe(false))
})

describe('canUseToken', () => {
  it('returns true for a valid non-revoked token', () =>
    expect(canUseToken({ expires_at: new Date(Date.now() + 60_000), revoked_at: null })).toBe(true))
  it('returns false for an expired token', () =>
    expect(canUseToken({ expires_at: new Date(Date.now() - 1000), revoked_at: null })).toBe(false))
  it('returns false for a revoked token', () =>
    expect(canUseToken({ expires_at: new Date(Date.now() + 60_000), revoked_at: new Date() })).toBe(false))
})

describe('generateRawRefreshToken', () => {
  it('returns a 64-char hex string', () => {
    const token = generateRawRefreshToken()
    expect(token).toHaveLength(64)
    expect(/^[0-9a-f]+$/.test(token)).toBe(true)
  })
  it('generates unique tokens', () =>
    expect(generateRawRefreshToken()).not.toBe(generateRawRefreshToken()))
})

describe('hashRefreshToken', () => {
  it('is deterministic', () =>
    expect(hashRefreshToken('abc')).toBe(hashRefreshToken('abc')))
  it('produces different hashes for different inputs', () =>
    expect(hashRefreshToken('abc')).not.toBe(hashRefreshToken('xyz')))
  it('returns a 64-char hex string', () =>
    expect(hashRefreshToken('abc')).toHaveLength(64))
})

describe('inferTtlDaysFromRecord', () => {
  it('returns 90 for a ~90-day token', () => {
    const created = new Date()
    const expires = new Date()
    expires.setDate(expires.getDate() + 90)
    expect(inferTtlDaysFromRecord(created, expires)).toBe(90)
  })
  it('returns 30 for a ~30-day token', () => {
    const created = new Date()
    const expires = new Date()
    expires.setDate(expires.getDate() + 30)
    expect(inferTtlDaysFromRecord(created, expires)).toBe(30)
  })
})
