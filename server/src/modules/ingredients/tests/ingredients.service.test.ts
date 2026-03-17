import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listIngredients,
  fetchIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  addAlias,
  removeAlias,
} from '../ingredients.service';
import * as repo from '../ingredients.repository';
import * as algorithms from '../domain/ingredients.algorithms';

vi.mock('../ingredients.repository');
vi.mock('../domain/ingredients.algorithms');

const mockPrisma = {} as any;

const mockIngredient = {
  id: 'ing-1',
  name: 'Salt',
  workspace_id: 'ws-1',
  created_at: new Date(),
  updated_at: new Date(),
  ingredient_aliases: [] as { id: string; alias: string }[],
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
    vi.mocked(repo.getAllIngredientNamesAndAliases).mockResolvedValue([]);
    vi.mocked(repo.createIngredient).mockResolvedValue(mockIngredient);
  });

  it('creates ingredient successfully', async () => {
    const result = await createIngredient(mockPrisma, { name: 'Salt' }, 'ws-1');
    expect(result.name).toBe('Salt');
  });

  it('throws conflict when name matches existing name (case-insensitive)', async () => {
    vi.mocked(repo.getAllIngredientNamesAndAliases).mockResolvedValue([
      { id: 'ing-2', name: 'salt', aliases: [] },
    ]);
    await expect(createIngredient(mockPrisma, { name: 'Salt' }, 'ws-1')).rejects.toThrow();
  });

  it('throws conflict when name matches existing alias', async () => {
    vi.mocked(repo.getAllIngredientNamesAndAliases).mockResolvedValue([
      { id: 'ing-2', name: 'eggplant', aliases: ['aubergine'] },
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
    vi.mocked(repo.getAllIngredientNamesAndAliases).mockResolvedValue([
      { id: 'ing-1', name: 'Salt', aliases: [] },
    ]);
    vi.mocked(repo.updateIngredient).mockResolvedValue({ ...mockIngredient, name: 'Fine Salt' });
    const result = await updateIngredient(mockPrisma, 'ing-1', 'ws-1', { name: 'Fine Salt' });
    expect(result.name).toBe('Fine Salt');
  });
});

describe('deleteIngredient', () => {
  it('throws 404 when not found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(null);
    await expect(deleteIngredient(mockPrisma, 'ing-1', 'ws-1')).rejects.toThrow();
  });

  it('deletes and returns id', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(mockIngredient);
    vi.mocked(repo.deleteIngredient).mockResolvedValue(mockIngredient);
    const result = await deleteIngredient(mockPrisma, 'ing-1', 'ws-1');
    expect(result.id).toBe('ing-1');
  });
});

describe('addAlias', () => {
  it('throws 404 when ingredient not found', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(null);
    await expect(addAlias(mockPrisma, 'ing-1', 'ws-1', 'alias')).rejects.toThrow();
  });

  it('throws conflict when alias conflicts with existing value', async () => {
    vi.mocked(repo.getIngredientById).mockResolvedValue(mockIngredient);
    vi.mocked(repo.getAllIngredientNamesAndAliases).mockResolvedValue([
      { id: 'ing-1', name: 'Salt', aliases: ['table salt'] },
    ]);
    await expect(addAlias(mockPrisma, 'ing-1', 'ws-1', 'Table Salt')).rejects.toThrow();
  });
});

describe('removeAlias', () => {
  it('throws 404 when alias not found', async () => {
    vi.mocked(repo.getAliasById).mockResolvedValue(null);
    await expect(removeAlias(mockPrisma, 'ing-1', 'alias-1', 'ws-1')).rejects.toThrow();
  });

  it('throws 404 when alias belongs to different ingredient', async () => {
    vi.mocked(repo.getAliasById).mockResolvedValue({
      id: 'alias-1',
      alias: 'aubergine',
      ingredient_id: 'ing-99',
      workspace_id: 'ws-1',
    });
    await expect(removeAlias(mockPrisma, 'ing-1', 'alias-1', 'ws-1')).rejects.toThrow();
  });
});
