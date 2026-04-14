import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  addVariant,
  updateVariant,
  deleteVariant,
} from './ingredients';
import { setAccessTokenGetter } from './apiClient';

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  setAccessTokenGetter(() => 'test-token');
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ data: { ingredients: [], meta: { page: 1, totalPages: 1 } } }),
      { status: 200 },
    ),
  );
});

afterEach(() => {
  setAccessTokenGetter(() => null);
  fetchSpy.mockRestore();
});

function okJson(data: unknown) {
  return new Response(JSON.stringify({ data }), { status: 200 });
}

function okPage(ingredients: unknown, meta = { page: 1, totalPages: 1 }) {
  return new Response(JSON.stringify({ data: { ingredients, meta } }), { status: 200 });
}

function errorJson(body: unknown, status = 400) {
  return new Response(JSON.stringify(body), { status });
}

function getLastCall() {
  const [url, options] = vi.mocked(fetch).mock.calls[0];
  const headers = options?.headers as Record<string, string>;
  return { url, options, headers };
}

// ── fetchIngredients ────────────────────────────────────────────────────────

describe('fetchIngredients', () => {
  it('calls GET /api/v1/ingredients with page and pageSize', async () => {
    fetchSpy.mockResolvedValueOnce(okPage([]));
    await fetchIngredients(1);
    const { url } = getLastCall();
    expect(url).toBe('/api/v1/ingredients?page=1&pageSize=20');
  });

  it('includes search param when provided', async () => {
    fetchSpy.mockResolvedValueOnce(okPage([]));
    await fetchIngredients(2, 'tomato');
    const { url } = getLastCall();
    expect(url).toBe('/api/v1/ingredients?page=2&pageSize=20&search=tomato');
  });

  it('omits search param when not provided', async () => {
    fetchSpy.mockResolvedValueOnce(okPage([]));
    await fetchIngredients(1);
    const { url } = getLastCall();
    expect(url).not.toContain('search');
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(okPage([]));
    await fetchIngredients(1);
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('returns data and meta from response', async () => {
    const items = [{ id: '1', name: 'Tomato', ingredient_variants: [] }];
    fetchSpy.mockResolvedValueOnce(okPage(items, { page: 1, totalPages: 3 }));
    const result = await fetchIngredients(1);
    expect(result.ingredients).toEqual(items);
    expect(result.meta).toEqual({ page: 1, totalPages: 3 });
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Server error' }));
    await expect(fetchIngredients(1)).rejects.toEqual({ message: 'Server error' });
  });
});

// ── createIngredient ────────────────────────────────────────────────────────

describe('createIngredient', () => {
  it('calls POST /api/v1/ingredients with correct body and headers', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Tomato' }));
    await createIngredient({ name: 'Tomato' });
    const { url, options, headers } = getLastCall();
    expect(url).toBe('/api/v1/ingredients');
    expect(options?.method).toBe('POST');
    expect(headers['Content-Type']).toBe('application/json');
    expect(options?.body).toBe(JSON.stringify({ name: 'Tomato' }));
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Tomato' }));
    await createIngredient({ name: 'Tomato' });
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Validation failed' }));
    await expect(createIngredient({ name: 'Tomato' })).rejects.toEqual({
      message: 'Validation failed',
    });
  });
});

// ── updateIngredient ────────────────────────────────────────────────────────

describe('updateIngredient', () => {
  it('calls PATCH /api/v1/ingredients/:id with correct body and headers', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Cherry Tomato' }));
    await updateIngredient('1', { name: 'Cherry Tomato' });
    const { url, options, headers } = getLastCall();
    expect(url).toBe('/api/v1/ingredients/1');
    expect(options?.method).toBe('PATCH');
    expect(headers['Content-Type']).toBe('application/json');
    expect(options?.body).toBe(JSON.stringify({ name: 'Cherry Tomato' }));
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: '1', name: 'Cherry Tomato' }));
    await updateIngredient('1', { name: 'Cherry Tomato' });
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Not found' }, 404));
    await expect(updateIngredient('1', { name: 'Cherry Tomato' })).rejects.toEqual({
      message: 'Not found',
    });
  });
});

// ── deleteIngredient ────────────────────────────────────────────────────────

describe('deleteIngredient', () => {
  it('calls DELETE /api/v1/ingredients/:id', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteIngredient('1');
    const { url, options } = getLastCall();
    expect(url).toBe('/api/v1/ingredients/1');
    expect(options?.method).toBe('DELETE');
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteIngredient('1');
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(
      errorJson({ statusCode: 409, message: 'In use' }, 409),
    );
    await expect(deleteIngredient('1')).rejects.toEqual({
      statusCode: 409,
      message: 'In use',
    });
  });
});

// ── addVariant ──────────────────────────────────────────────────────────────

describe('addVariant', () => {
  it('calls POST /api/v1/ingredients/:id/variants with correct body and headers', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: 'v1', variant: 'Cherry' }));
    await addVariant('1', { variant: 'Cherry' });
    const { url, options, headers } = getLastCall();
    expect(url).toBe('/api/v1/ingredients/1/variants');
    expect(options?.method).toBe('POST');
    expect(headers['Content-Type']).toBe('application/json');
    expect(options?.body).toBe(JSON.stringify({ variant: 'Cherry' }));
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: 'v1', variant: 'Cherry' }));
    await addVariant('1', { variant: 'Cherry' });
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Validation failed' }));
    await expect(addVariant('1', { variant: 'Cherry' })).rejects.toEqual({
      message: 'Validation failed',
    });
  });
});

// ── updateVariant ───────────────────────────────────────────────────────────

describe('updateVariant', () => {
  it('calls PATCH /api/v1/ingredients/:id/variants/:variantId with correct body', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: 'v1', variant: 'Plum Tomato' }));
    await updateVariant('1', 'v1', { variant: 'Plum Tomato' });
    const { url, options, headers } = getLastCall();
    expect(url).toBe('/api/v1/ingredients/1/variants/v1');
    expect(options?.method).toBe('PATCH');
    expect(headers['Content-Type']).toBe('application/json');
    expect(options?.body).toBe(JSON.stringify({ variant: 'Plum Tomato' }));
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(okJson({ id: 'v1', variant: 'Plum Tomato' }));
    await updateVariant('1', 'v1', { variant: 'Plum Tomato' });
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(errorJson({ message: 'Not found' }, 404));
    await expect(updateVariant('1', 'v1', { variant: 'Plum Tomato' })).rejects.toEqual({
      message: 'Not found',
    });
  });
});

// ── deleteVariant ───────────────────────────────────────────────────────────

describe('deleteVariant', () => {
  it('calls DELETE /api/v1/ingredients/:id/variants/:variantId', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteVariant('1', 'v1');
    const { url, options } = getLastCall();
    expect(url).toBe('/api/v1/ingredients/1/variants/v1');
    expect(options?.method).toBe('DELETE');
  });

  it('includes Authorization bearer token', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteVariant('1', 'v1');
    const { headers } = getLastCall();
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('throws on non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce(
      errorJson({ statusCode: 409, message: 'In use' }, 409),
    );
    await expect(deleteVariant('1', 'v1')).rejects.toEqual({
      statusCode: 409,
      message: 'In use',
    });
  });
});
