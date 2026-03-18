import { describe, it, expect, vi } from 'vitest';
import {
  listDishTypes,
  createDishType,
  updateDishType,
  deleteDishType,
} from '../dish-types.service';
import * as repo from '../dish-types.repository';

vi.mock('../dish-types.repository');

const mockPrisma = {} as any;
const mockDishType = { id: 'dt-1', name: 'Main Course' };

describe('listDishTypes', () => {
  it('returns list of dish types', async () => {
    vi.mocked(repo.listDishTypes).mockResolvedValue([mockDishType]);
    const result = await listDishTypes(mockPrisma, 'ws-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Main Course');
  });
});

describe('createDishType', () => {
  it('creates and returns dish type', async () => {
    vi.mocked(repo.createDishType).mockResolvedValue(mockDishType);
    const result = await createDishType(mockPrisma, { name: 'Main Course' }, 'ws-1');
    expect(result.name).toBe('Main Course');
  });

  it('throws conflict on P2002', async () => {
    vi.mocked(repo.createDishType).mockRejectedValue({ code: 'P2002' });
    await expect(createDishType(mockPrisma, { name: 'Main Course' }, 'ws-1')).rejects.toThrow();
  });

  it('rethrows non-P2002 errors', async () => {
    const err = new Error('unexpected');
    vi.mocked(repo.createDishType).mockRejectedValue(err);
    await expect(createDishType(mockPrisma, { name: 'Main Course' }, 'ws-1')).rejects.toThrow(
      'unexpected',
    );
  });
});

describe('updateDishType', () => {
  it('throws 404 when dish type not found', async () => {
    vi.mocked(repo.getDishTypeById).mockResolvedValue(null);
    await expect(
      updateDishType(mockPrisma, 'dt-1', 'ws-1', { name: 'Starter' }),
    ).rejects.toThrow();
  });

  it('updates and returns dish type', async () => {
    vi.mocked(repo.getDishTypeById).mockResolvedValue(mockDishType);
    vi.mocked(repo.updateDishType).mockResolvedValue({ id: 'dt-1', name: 'Starter' });
    const result = await updateDishType(mockPrisma, 'dt-1', 'ws-1', { name: 'Starter' });
    expect(result.name).toBe('Starter');
  });

  it('throws conflict on P2002 during update', async () => {
    vi.mocked(repo.getDishTypeById).mockResolvedValue(mockDishType);
    vi.mocked(repo.updateDishType).mockRejectedValue({ code: 'P2002' });
    await expect(
      updateDishType(mockPrisma, 'dt-1', 'ws-1', { name: 'Starter' }),
    ).rejects.toThrow();
  });
});

describe('deleteDishType', () => {
  it('throws 404 when dish type not found', async () => {
    vi.mocked(repo.getDishTypeById).mockResolvedValue(null);
    await expect(deleteDishType(mockPrisma, 'dt-1', 'ws-1')).rejects.toThrow();
  });

  it('throws 409 when referenced by recipes', async () => {
    vi.mocked(repo.getDishTypeById).mockResolvedValue(mockDishType);
    vi.mocked(repo.countDishTypeReferences).mockResolvedValue({
      recipeCount: 1,
      constraintCount: 0,
    });
    await expect(deleteDishType(mockPrisma, 'dt-1', 'ws-1')).rejects.toThrow();
  });

  it('throws 409 when referenced by constraints', async () => {
    vi.mocked(repo.getDishTypeById).mockResolvedValue(mockDishType);
    vi.mocked(repo.countDishTypeReferences).mockResolvedValue({
      recipeCount: 0,
      constraintCount: 1,
    });
    await expect(deleteDishType(mockPrisma, 'dt-1', 'ws-1')).rejects.toThrow();
  });

  it('deletes and returns success when not referenced', async () => {
    vi.mocked(repo.getDishTypeById).mockResolvedValue(mockDishType);
    vi.mocked(repo.countDishTypeReferences).mockResolvedValue({
      recipeCount: 0,
      constraintCount: 0,
    });
    vi.mocked(repo.deleteDishType).mockResolvedValue({
      id: 'dt-1',
      name: 'Main Course',
      workspace_id: 'ws-1',
      created_at: new Date(),
      updated_at: new Date(),
    });
    const result = await deleteDishType(mockPrisma, 'dt-1', 'ws-1');
    expect(result.success).toBe(true);
  });
});
