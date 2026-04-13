import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, refreshToken } from './auth';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('login', () => {
  it('calls correct endpoint with correct body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { user: { id: '1', email: 'a@b.com', role: 'admin', userName: 'a', firstName: 'A', lastName: 'B' }, accessToken: 'tok' } }),
    });

    await login({ email: 'a@b.com', password: 'secret' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
      })
    );
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Unauthorized' }),
    });

    await expect(login({ email: 'a@b.com', password: 'wrong' })).rejects.toEqual({
      message: 'Unauthorized',
    });
  });
});

describe('refreshToken', () => {
  it('calls correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { accessToken: 'new-tok' } }),
    });

    await refreshToken();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    );
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Token expired' }),
    });

    await expect(refreshToken()).rejects.toEqual({ message: 'Token expired' });
  });
});
