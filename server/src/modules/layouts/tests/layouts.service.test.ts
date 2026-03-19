import { describe, it, expect, vi } from 'vitest';
import { reorderSlots } from '../layouts.service';
import * as repo from '../layouts.repository';

vi.mock('../layouts.repository');

const mockPrisma = {} as any;

const LAYOUT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SLOT_1 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SLOT_2 = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const mockLayout = {
  id: LAYOUT_ID,
  days: [1, 2, 3],
  schedule_id: 'sched-1',
  schedule: { workspace_id: 'ws-1' },
};

const mockSlots = [
  { id: SLOT_1, order: 0, meal_type_id: 'mt-1' },
  { id: SLOT_2, order: 1, meal_type_id: 'mt-2' },
];

describe('reorderSlots', () => {
  it('throws 404 when layout not found', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(null);
    await expect(
      reorderSlots(mockPrisma, LAYOUT_ID, 'ws-1', [SLOT_1, SLOT_2]),
    ).rejects.toThrow();
  });

  it('throws 404 when layout belongs to a different workspace', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue({
      ...mockLayout,
      schedule: { workspace_id: 'ws-other' },
    });
    await expect(
      reorderSlots(mockPrisma, LAYOUT_ID, 'ws-1', [SLOT_1, SLOT_2]),
    ).rejects.toThrow();
  });

  it('throws 400 when slotIds do not match existing slots', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(mockLayout);
    vi.mocked(repo.getMealSlotsByLayoutId).mockResolvedValue(mockSlots);
    await expect(
      reorderSlots(mockPrisma, LAYOUT_ID, 'ws-1', [SLOT_1]),
    ).rejects.toThrow();
  });

  it('throws 400 when slotIds contains unknown id', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(mockLayout);
    vi.mocked(repo.getMealSlotsByLayoutId).mockResolvedValue(mockSlots);
    const unknownId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    await expect(
      reorderSlots(mockPrisma, LAYOUT_ID, 'ws-1', [SLOT_1, unknownId]),
    ).rejects.toThrow();
  });

  it('returns success when reorder is valid', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(mockLayout);
    vi.mocked(repo.getMealSlotsByLayoutId).mockResolvedValue(mockSlots);
    vi.mocked(repo.reorderMealSlots).mockResolvedValue([]);
    const result = await reorderSlots(mockPrisma, LAYOUT_ID, 'ws-1', [SLOT_2, SLOT_1]);
    expect(result.success).toBe(true);
  });

  it('derives order from array index', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(mockLayout);
    vi.mocked(repo.getMealSlotsByLayoutId).mockResolvedValue(mockSlots);
    vi.mocked(repo.reorderMealSlots).mockResolvedValue([]);
    await reorderSlots(mockPrisma, LAYOUT_ID, 'ws-1', [SLOT_2, SLOT_1]);
    expect(repo.reorderMealSlots).toHaveBeenCalledWith(mockPrisma, [
      { id: SLOT_2, order: 0 },
      { id: SLOT_1, order: 1 },
    ]);
  });

  it('succeeds with empty slot list when layout has no slots', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(mockLayout);
    vi.mocked(repo.getMealSlotsByLayoutId).mockResolvedValue([]);
    vi.mocked(repo.reorderMealSlots).mockResolvedValue([]);
    const result = await reorderSlots(mockPrisma, LAYOUT_ID, 'ws-1', []);
    expect(result.success).toBe(true);
  });
});
