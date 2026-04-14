import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchDishTypes,
  createDishType,
  updateDishType,
  deleteDishType,
} from './dishTypes';

// dishTypes.ts uses apiFetch which reads the module-level getter; stub fetch directly
let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), { status: 200 })
  );
});

afterEach(() => {
  fetchSpy.mockRestore();
});

function okJson(data: unknown) {
  return new Response(JSON.stringify({ data }), { status: 200 });
}

function errorJson(body: unknown, status = 400) {
  return new Response(JSON.stringify(body), { status });
}

describe('fetchDishTypes', () => {
  it('calls GET /api/v1/dish-types', async () => {
    fetchSpy.mockResolvedValueOnce(okJson([]));
    await fetchDishTypes();
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/v1/dish-types');
  });

  it('returns the data array from the response', async () => {
    const items = [{ id: '1', name: 'Salad' }];
    fetchSpy.mockResolvedValueOnce(okJson(items));
    const result = await fetchDishTypes();
    expect(result).toEqual(items);
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Server error' }));
    await expect(fetchDishTypes()).rejects.toEqual({ message: 'Server error' });
  });
});

describe('createDishType', () => {
  it('calls POST /api/v1/dish-types with correct body and headers', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Salad' }));
    await createDishType({ name: 'Salad' });
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/v1/dish-types');
    expect(options?.method).toBe('POST');
    expect((options?.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json'
    );
    expect(options?.body).toBe(JSON.stringify({ name: 'Salad' }));
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Validation failed' }));
    await expect(createDishType({ name: 'Salad' })).rejects.toEqual({
      message: 'Validation failed',
    });
  });
});

describe('updateDishType', () => {
  it('calls PATCH /api/v1/dish-types/:id with correct body and headers', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Soup' }));
    await updateDishType('1', { name: 'Soup' });
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/v1/dish-types/1');
    expect(options?.method).toBe('PATCH');
    expect((options?.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json'
    );
    expect(options?.body).toBe(JSON.stringify({ name: 'Soup' }));
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Not found' }, 404));
    await expect(updateDishType('1', { name: 'Soup' })).rejects.toEqual({
      message: 'Not found',
    });
  });
});

describe('deleteDishType', () => {
  it('calls DELETE /api/v1/dish-types/:id', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteDishType('1');
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/v1/dish-types/1');
    expect(options?.method).toBe('DELETE');
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(
      errorJson({ statusCode: 409, message: 'In use' }, 409)
    );
    await expect(deleteDishType('1')).rejects.toEqual({
      statusCode: 409,
      message: 'In use',
    });
  });
});
