import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listIngredients,
  fetchIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  addVariant,
  removeVariant,
} from '../ingredients.service';
import * as repo from '../ingredients.repository';
import * as algorithms from '../domain/ingredients.algorithms';

vi.mock('../ingredients.repository');
vi.mock('../domain/ingredients.algorithms');

const mockPrisma = {} as any;

const mockIngredient = {
  id: 'ing-1',
  name: 'Salt',
  category: null as string | null,
  workspace_id: 'ws-1',
  created_at: new Date(),
  updated_at: new Date(),
  ingredient_variants: [] as { id: string; variant: string }[],
};

describe('fetchIngredientById', () => {
  it('returns ingredient when found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(mockIngredient);
    const result = await fetchIngredientById(mockPrisma, 'ing-1', 'ws-1');
    expect(result.name).toBe('Salt');
  });

  it('throws 404 when not found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(null);
    await expect(fetchIngredientById(mockPrisma, 'ing-1', 'ws-1')).rejects.toThrow();
  });
});

describe('listIngredients', () => {
  it('returns paginated items with meta', async () => {
    vi.mocked(repo.listIngredients).mockResolvedValue({ items: [mockIngredient], total: 1 });
    const result = await listIngredients(mockPrisma, 'ws-1', { page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });
});

describe('createIngredient', () => {
  beforeEach(() => {
    vi.mocked(repo.getAllIngredientNamesAndVariants).mockResolvedValue([]);
    vi.mocked(repo.createIngredient).mockResolvedValue(mockIngredient);
  });

  it('creates ingredient successfully', async () => {
    const result = await createIngredient(mockPrisma, { name: 'Salt' }, 'ws-1');
    expect(result.name).toBe('Salt');
  });

  it('throws conflict when name matches existing name (case-insensitive)', async () => {
    vi.mocked(repo.getAllIngredientNamesAndVariants).mockResolvedValue([
      { id: 'ing-2', name: 'salt', variants: [] },
    ]);
    await expect(createIngredient(mockPrisma, { name: 'Salt' }, 'ws-1')).rejects.toThrow();
  });

  it('throws conflict when name matches existing variant', async () => {
    vi.mocked(repo.getAllIngredientNamesAndVariants).mockResolvedValue([
      { id: 'ing-2', name: 'eggplant', variants: ['aubergine'] },
    ]);
    await expect(createIngredient(mockPrisma, { name: 'Aubergine' }, 'ws-1')).rejects.toThrow();
  });
});

describe('updateIngredient', () => {
  it('throws 404 when ingredient not found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(null);
    await expect(
      updateIngredient(mockPrisma, 'ing-1', 'ws-1', { name: 'Pepper' }),
    ).rejects.toThrow();
  });

  it('excludes self from conflict check and updates successfully', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(mockIngredient);
    vi.mocked(repo.getAllIngredientNamesAndVariants).mockResolvedValue([
      { id: 'ing-1', name: 'Salt', variants: [] },
    ]);
    vi.mocked(repo.updateIngredient).mockResolvedValue({ ...mockIngredient, name: 'Fine Salt' });
    const result = await updateIngredient(mockPrisma, 'ing-1', 'ws-1', { name: 'Fine Salt' });
    expect(result.name).toBe('Fine Salt');
  });
});

describe('deleteIngredient', () => {
  it('deletes and returns id when ingredient has no variants', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(mockIngredient);
    vi.mocked(repo.deleteIngredient).mockResolvedValue(mockIngredient);
    const result = await deleteIngredient(mockPrisma, 'ing-1', 'ws-1');
    expect(result.id).toBe('ing-1');
  });

  it('throws 404 when not found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(null);
    await expect(deleteIngredient(mockPrisma, 'ing-1', 'ws-1')).rejects.toThrow();
  });

  it('throws 409 when ingredient has variants', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue({
      ...mockIngredient,
      ingredient_variants: [{ id: 'var-1', variant: 'aubergine' }],
    });
    await expect(deleteIngredient(mockPrisma, 'ing-1', 'ws-1')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ingredient_has_variants',
    });
  });
});

describe('addVariant', () => {
  it('throws 404 when ingredient not found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(null);
    await expect(addVariant(mockPrisma, 'ing-1', 'ws-1', 'variant')).rejects.toThrow();
  });

  it('throws conflict when variant conflicts with existing value', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(mockIngredient);
    vi.mocked(repo.getAllIngredientNamesAndVariants).mockResolvedValue([
      { id: 'ing-1', name: 'Salt', variants: ['table salt'] },
    ]);
    await expect(addVariant(mockPrisma, 'ing-1', 'ws-1', 'Table Salt')).rejects.toThrow();
  });
});

describe('removeVariant', () => {
  it('throws 404 when variant not found', async () => {
    vi.mocked(repo.getVariantById).mockResolvedValue(null);
    await expect(removeVariant(mockPrisma, 'ing-1', 'variant-1', 'ws-1')).rejects.toThrow();
  });

  it('throws 404 when variant belongs to different ingredient', async () => {
    vi.mocked(repo.getVariantById).mockResolvedValue({
      id: 'variant-1',
      variant: 'aubergine',
      ingredient_id: 'ing-99',
      workspace_id: 'ws-1',
    });
    await expect(removeVariant(mockPrisma, 'ing-1', 'variant-1', 'ws-1')).rejects.toThrow();
  });
});
