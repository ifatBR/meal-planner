import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchMealTypes,
  createMealType,
  updateMealType,
  deleteMealType,
} from './mealTypes';
import { setAccessTokenGetter } from './apiClient';

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  setAccessTokenGetter(() => 'test-token');
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), { status: 200 })
  );
});

afterEach(() => {
  setAccessTokenGetter(() => null);
  fetchSpy.mockRestore();
});

function okJson(data: unknown) {
  return new Response(JSON.stringify({ data }), { status: 200 });
}

function errorJson(body: unknown, status = 400) {
  return new Response(JSON.stringify(body), { status });
}

function getLastCall() {
  const [url, options] = vi.mocked(fetch).mock.calls[0];
  const headers = options?.headers as Record<string, string>;
  return { url, options, headers };
}

describe('fetchMealTypes', () => {
  it('calls GET /api/v1/meal-types', async () => {
    fetchSpy.mockResolvedValueOnce(okJson([]));
    await fetchMealTypes();
    const { url } = getLastCall();
    expect(url).toBe('/api/v1/meal-types');
  });

  it('includes credentials: include', async () => {
    fetchSpy.mockResolvedValueOnce(okJson([]));
    await fetchMealTypes();
    const { options } = getLastCall();
    expect(options?.credentials).toBe('include');
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(okJson([]));
    await fetchMealTypes();
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('returns the data array from the response', async () => {
    const items = [{ id: '1', name: 'Breakfast', color: '#AEE553' }];
    fetchSpy.mockResolvedValueOnce(okJson(items));
    const result = await fetchMealTypes();
    expect(result).toEqual(items);
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Server error' }));
    await expect(fetchMealTypes()).rejects.toEqual({ message: 'Server error' });
  });
});

describe('createMealType', () => {
  it('calls POST /api/v1/meal-types with correct body and headers', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Breakfast', color: '#AEE553' }));
    await createMealType({ name: 'Breakfast', color: '#AEE553' });
    const { url, options, headers } = getLastCall();
    expect(url).toBe('/api/v1/meal-types');
    expect(options?.method).toBe('POST');
    expect(headers['Content-Type']).toBe('application/json');
    expect(options?.body).toBe(JSON.stringify({ name: 'Breakfast', color: '#AEE553' }));
  });

  it('includes credentials: include', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Breakfast', color: '#AEE553' }));
    await createMealType({ name: 'Breakfast', color: '#AEE553' });
    const { options } = getLastCall();
    expect(options?.credentials).toBe('include');
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Breakfast', color: '#AEE553' }));
    await createMealType({ name: 'Breakfast', color: '#AEE553' });
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Validation failed' }));
    await expect(createMealType({ name: 'Breakfast', color: '#AEE553' })).rejects.toEqual({
      message: 'Validation failed',
    });
  });
});

describe('updateMealType', () => {
  it('calls PATCH /api/v1/meal-types/:id with correct body and headers', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Brunch', color: '#AEE553' }));
    await updateMealType('1', { name: 'Brunch' });
    const { url, options, headers } = getLastCall();
    expect(url).toBe('/api/v1/meal-types/1');
    expect(options?.method).toBe('PATCH');
    expect(headers['Content-Type']).toBe('application/json');
    expect(options?.body).toBe(JSON.stringify({ name: 'Brunch' }));
  });

  it('includes credentials: include', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Brunch', color: '#AEE553' }));
    await updateMealType('1', { name: 'Brunch' });
    const { options } = getLastCall();
    expect(options?.credentials).toBe('include');
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Brunch', color: '#AEE553' }));
    await updateMealType('1', { name: 'Brunch' });
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Not found' }, 404));
    await expect(updateMealType('1', { name: 'Brunch' })).rejects.toEqual({
      message: 'Not found',
    });
  });
});

describe('deleteMealType', () => {
  it('calls DELETE /api/v1/meal-types/:id', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteMealType('1');
    const { url, options } = getLastCall();
    expect(url).toBe('/api/v1/meal-types/1');
    expect(options?.method).toBe('DELETE');
  });

  it('includes credentials: include', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteMealType('1');
    const { options } = getLastCall();
    expect(options?.credentials).toBe('include');
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteMealType('1');
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(
      errorJson({ statusCode: 409, message: 'In use' }, 409)
    );
    await expect(deleteMealType('1')).rejects.toEqual({
      statusCode: 409,
      message: 'In use',
    });
  });
});
