import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, setAccessTokenGetter } from './apiClient';

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  setAccessTokenGetter(() => null);
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(null, { status: 200 })
  );
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe('apiFetch', () => {
  it('includes Authorization header when token is available', async () => {
    setAccessTokenGetter(() => 'test-token-123');

    await apiFetch('/api/v1/meal-types');

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token-123');
  });

  it('omits Authorization header when token is null', async () => {
    await apiFetch('/api/v1/meal-types');

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers).not.toHaveProperty('Authorization');
  });

  it('always includes credentials: include', async () => {
    await apiFetch('/api/v1/meal-types');

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(options?.credentials).toBe('include');
  });

  it('passes the url as the first argument to fetch', async () => {
    await apiFetch('/api/v1/meal-types');

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/v1/meal-types');
  });

  it('spreads custom options (method, body) onto the fetch call', async () => {
    const body = JSON.stringify({ name: 'Breakfast' });

    await apiFetch('/api/v1/meal-types', { method: 'POST', body });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(options?.method).toBe('POST');
    expect(options?.body).toBe(body);
  });

  it('merges caller-supplied headers with built-in headers', async () => {
    setAccessTokenGetter(() => 'token');

    await apiFetch('/api/v1/meal-types', { headers: { 'X-Custom': 'value' } });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer token');
    expect(headers['X-Custom']).toBe('value');
  });
});

describe('setAccessTokenGetter', () => {
  it('updates the getter used by subsequent apiFetch calls', async () => {
    setAccessTokenGetter(() => 'new-token');

    await apiFetch('/api/v1/meal-types');

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer new-token');
  });

  it('replacing getter with null-returning function omits Authorization', async () => {
    setAccessTokenGetter(() => 'old-token');
    setAccessTokenGetter(() => null);

    await apiFetch('/api/v1/meal-types');

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers).not.toHaveProperty('Authorization');
  });
});
