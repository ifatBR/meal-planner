import { describe, it, expect, vi } from 'vitest';
import {
  listMealTypes,
  createMealType,
  updateMealType,
  deleteMealType,
} from '../meal-types.service';
import * as repo from '../meal-types.repository';

vi.mock('../meal-types.repository');

const mockPrisma = {} as any;
const mockMealType = { id: 'mt-1', name: 'Breakfast', color: '#AEE553' };

describe('listMealTypes', () => {
  it('returns list of meal types', async () => {
    vi.mocked(repo.listMealTypes).mockResolvedValue([mockMealType] as any);
    const result = await listMealTypes(mockPrisma, 'ws-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Breakfast');
  });
});

describe('createMealType', () => {
  it('creates and returns meal type', async () => {
    vi.mocked(repo.createMealType).mockResolvedValue(mockMealType as any);
    const result = await createMealType(mockPrisma, { name: 'Breakfast', color: '#AEE553' }, 'ws-1');
    expect(result.name).toBe('Breakfast');
  });

  it('throws conflict on P2002', async () => {
    vi.mocked(repo.createMealType).mockRejectedValue({ code: 'P2002' });
    await expect(createMealType(mockPrisma, { name: 'Breakfast', color: '#AEE553' }, 'ws-1')).rejects.toThrow();
  });

  it('rethrows non-P2002 errors', async () => {
    const err = new Error('unexpected');
    vi.mocked(repo.createMealType).mockRejectedValue(err);
    await expect(createMealType(mockPrisma, { name: 'Breakfast', color: '#AEE553' }, 'ws-1')).rejects.toThrow(
      'unexpected',
    );
  });
});

describe('updateMealType', () => {
  it('throws 404 when meal type not found', async () => {
    vi.mocked(repo.getMealTypeById).mockResolvedValue(null);
    await expect(
      updateMealType(mockPrisma, 'mt-1', 'ws-1', { name: 'Lunch' }),
    ).rejects.toThrow();
  });

  it('updates and returns meal type', async () => {
    vi.mocked(repo.getMealTypeById).mockResolvedValue(mockMealType as any);
    vi.mocked(repo.updateMealType).mockResolvedValue({ id: 'mt-1', name: 'Lunch', color: '#AEE553' } as any);
    const result = await updateMealType(mockPrisma, 'mt-1', 'ws-1', { name: 'Lunch' });
    expect(result.name).toBe('Lunch');
  });

  it('throws conflict on P2002 during update', async () => {
    vi.mocked(repo.getMealTypeById).mockResolvedValue(mockMealType as any);
    vi.mocked(repo.updateMealType).mockRejectedValue({ code: 'P2002' });
    await expect(
      updateMealType(mockPrisma, 'mt-1', 'ws-1', { name: 'Lunch' }),
    ).rejects.toThrow();
  });
});

describe('deleteMealType', () => {
  it('throws 404 when meal type not found', async () => {
    vi.mocked(repo.getMealTypeById).mockResolvedValue(null);
    await expect(deleteMealType(mockPrisma, 'mt-1', 'ws-1')).rejects.toThrow();
  });

  it('throws 409 when referenced by recipe_meal_types', async () => {
    vi.mocked(repo.getMealTypeById).mockResolvedValue(mockMealType as any);
    vi.mocked(repo.countMealTypeReferences).mockResolvedValue({
      recipeMealTypeCount: 1,
      scheduleMealCount: 0,
      mealSlotCount: 0,
    });
    await expect(deleteMealType(mockPrisma, 'mt-1', 'ws-1')).rejects.toThrow();
  });

  it('throws 409 when referenced by schedule_meals', async () => {
    vi.mocked(repo.getMealTypeById).mockResolvedValue(mockMealType as any);
    vi.mocked(repo.countMealTypeReferences).mockResolvedValue({
      recipeMealTypeCount: 0,
      scheduleMealCount: 1,
      mealSlotCount: 0,
    });
    await expect(deleteMealType(mockPrisma, 'mt-1', 'ws-1')).rejects.toThrow();
  });

  it('throws 409 when referenced by meal_slots', async () => {
    vi.mocked(repo.getMealTypeById).mockResolvedValue(mockMealType as any);
    vi.mocked(repo.countMealTypeReferences).mockResolvedValue({
      recipeMealTypeCount: 0,
      scheduleMealCount: 0,
      mealSlotCount: 1,
    });
    await expect(deleteMealType(mockPrisma, 'mt-1', 'ws-1')).rejects.toThrow();
  });

  it('throws 409 when referenced by all three', async () => {
    vi.mocked(repo.getMealTypeById).mockResolvedValue(mockMealType as any);
    vi.mocked(repo.countMealTypeReferences).mockResolvedValue({
      recipeMealTypeCount: 2,
      scheduleMealCount: 1,
      mealSlotCount: 3,
    });
    await expect(deleteMealType(mockPrisma, 'mt-1', 'ws-1')).rejects.toThrow();
  });

  it('deletes and returns success when not referenced', async () => {
    vi.mocked(repo.getMealTypeById).mockResolvedValue(mockMealType as any);
    vi.mocked(repo.countMealTypeReferences).mockResolvedValue({
      recipeMealTypeCount: 0,
      scheduleMealCount: 0,
      mealSlotCount: 0,
    });
    vi.mocked(repo.deleteMealType).mockResolvedValue({
      id: 'mt-1',
      name: 'Breakfast',
      workspace_id: 'ws-1',
      created_at: new Date(),
      updated_at: new Date(),
    });
    const result = await deleteMealType(mockPrisma, 'mt-1', 'ws-1');
    expect(result.success).toBe(true);
  });
});
