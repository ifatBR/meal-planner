import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listLayouts,
  fetchLayoutById,
  createLayout,
  updateLayout,
  cloneLayout,
  deleteLayout,
} from '../layouts.service';
import * as repo from '../layouts.repository';
import * as mealTypesRepo from '../../meal-types/meal-types.repository';
import * as dishTypesRepo from '../../dish-types/dish-types.repository';
import { LayoutConflictError } from '../../../utils/errors';

vi.mock('../layouts.repository');
vi.mock('../../meal-types/meal-types.repository');
vi.mock('../../dish-types/dish-types.repository');

const mockPrisma = {} as any;

const LAYOUT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DT_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SCHED_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const minimalLayout = {
  id: LAYOUT_ID,
  name: 'Test Layout',
  schedules: [] as Array<{ id: string; name: string }>,
  week_days_layouts: [],
};

const validWeekDaysLayouts = [
  {
    days: [0, 1, 2],
    mealSlots: [
      {
        mealTypeId: MT_ID,
        dishAllocations: [{ dishTypeId: DT_ID, amount: 2 }],
      },
    ],
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(mealTypesRepo.getMealTypesByIds).mockResolvedValue([{ id: MT_ID }]);
  vi.mocked(dishTypesRepo.getDishTypesByIds).mockResolvedValue([{ id: DT_ID }]);
});

describe('listLayouts', () => {
  it('returns layouts from repository', async () => {
    const mockItems = [{ id: LAYOUT_ID, name: 'A', created_at: new Date(), updated_at: new Date(), _count: { schedules: 0 } }];
    vi.mocked(repo.getLayouts).mockResolvedValue(mockItems);
    const result = await listLayouts(mockPrisma, 'ws-1');
    expect(result).toBe(mockItems);
  });
});

describe('fetchLayoutById', () => {
  it('returns layout when found', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(minimalLayout);
    const result = await fetchLayoutById(mockPrisma, LAYOUT_ID, 'ws-1');
    expect(result.id).toBe(LAYOUT_ID);
  });

  it('throws 404 when layout not found', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(null);
    await expect(fetchLayoutById(mockPrisma, LAYOUT_ID, 'ws-1')).rejects.toThrow();
  });
});

describe('createLayout', () => {
  it('creates layout when valid', async () => {
    const mockResult = { id: LAYOUT_ID, name: 'New', created_at: new Date(), updated_at: new Date() };
    vi.mocked(repo.createLayout).mockResolvedValue(mockResult);
    const result = await createLayout(mockPrisma, 'ws-1', { name: 'New', weekDaysLayouts: validWeekDaysLayouts });
    expect(result.id).toBe(LAYOUT_ID);
  });

  it('throws rule violation when days overlap across layouts', async () => {
    await expect(
      createLayout(mockPrisma, 'ws-1', {
        name: 'Bad',
        weekDaysLayouts: [
          { days: [0, 1], mealSlots: [{ mealTypeId: MT_ID, dishAllocations: [{ dishTypeId: DT_ID, amount: 1 }] }] },
          { days: [1, 2], mealSlots: [{ mealTypeId: MT_ID, dishAllocations: [{ dishTypeId: DT_ID, amount: 1 }] }] },
        ],
      }),
    ).rejects.toThrow();
  });

  it('throws 400 when mealTypeId does not exist in workspace', async () => {
    vi.mocked(mealTypesRepo.getMealTypesByIds).mockResolvedValue([]);
    await expect(
      createLayout(mockPrisma, 'ws-1', { name: 'Bad', weekDaysLayouts: validWeekDaysLayouts }),
    ).rejects.toThrow();
  });

  it('throws 400 when dishTypeId does not exist in workspace', async () => {
    vi.mocked(dishTypesRepo.getDishTypesByIds).mockResolvedValue([]);
    await expect(
      createLayout(mockPrisma, 'ws-1', { name: 'Bad', weekDaysLayouts: validWeekDaysLayouts }),
    ).rejects.toThrow();
  });
});

describe('updateLayout', () => {
  it('updates name only without conflict checks', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(minimalLayout);
    const mockResult = { id: LAYOUT_ID, name: 'Updated', updated_at: new Date(), schedules: [] };
    vi.mocked(repo.updateLayout).mockResolvedValue(mockResult);
    const result = await updateLayout(mockPrisma, LAYOUT_ID, 'ws-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
    expect(mealTypesRepo.getMealTypesByIds).not.toHaveBeenCalled();
  });

  it('throws 404 when layout not found', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(null);
    await expect(updateLayout(mockPrisma, LAYOUT_ID, 'ws-1', { name: 'X' })).rejects.toThrow();
  });

  it('allows structural edit when layout has no schedules', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(minimalLayout);
    const mockResult = { id: LAYOUT_ID, name: 'L', updated_at: new Date(), schedules: [] };
    vi.mocked(repo.updateLayout).mockResolvedValue(mockResult);
    await expect(
      updateLayout(mockPrisma, LAYOUT_ID, 'ws-1', { weekDaysLayouts: validWeekDaysLayouts }),
    ).resolves.not.toThrow();
  });

  it('allows structural edit when used by exactly one schedule and scheduleId matches', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue({
      ...minimalLayout,
      schedules: [{ id: SCHED_ID, name: 'My Schedule' }],
    });
    const mockResult = { id: LAYOUT_ID, name: 'L', updated_at: new Date(), schedules: [{ id: SCHED_ID, name: 'My Schedule' }] };
    vi.mocked(repo.updateLayout).mockResolvedValue(mockResult);
    await expect(
      updateLayout(mockPrisma, LAYOUT_ID, 'ws-1', { weekDaysLayouts: validWeekDaysLayouts }, SCHED_ID),
    ).resolves.not.toThrow();
  });

  it('throws LayoutConflictError when used by one schedule and scheduleId is not provided', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue({
      ...minimalLayout,
      schedules: [{ id: SCHED_ID, name: 'My Schedule' }],
    });
    await expect(
      updateLayout(mockPrisma, LAYOUT_ID, 'ws-1', { weekDaysLayouts: validWeekDaysLayouts }),
    ).rejects.toThrow(LayoutConflictError);
  });

  it('throws LayoutConflictError when used by two or more schedules', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue({
      ...minimalLayout,
      schedules: [
        { id: SCHED_ID, name: 'Schedule A' },
        { id: 'other-sched', name: 'Schedule B' },
      ],
    });
    await expect(
      updateLayout(mockPrisma, LAYOUT_ID, 'ws-1', { weekDaysLayouts: validWeekDaysLayouts }, SCHED_ID),
    ).rejects.toThrow(LayoutConflictError);
  });
});

describe('cloneLayout', () => {
  it('clones layout and returns summary', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(minimalLayout);
    const clonedResult = { id: 'clone-id', name: 'Clone', created_at: new Date(), updated_at: new Date() };
    vi.mocked(repo.cloneLayout).mockResolvedValue(clonedResult);
    const result = await cloneLayout(mockPrisma, LAYOUT_ID, 'ws-1', 'Clone');
    expect(result.name).toBe('Clone');
  });

  it('throws 404 when source layout not found', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(null);
    await expect(cloneLayout(mockPrisma, LAYOUT_ID, 'ws-1', 'Clone')).rejects.toThrow();
  });
});

describe('deleteLayout', () => {
  it('deletes layout when not in use', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(minimalLayout);
    vi.mocked(repo.deleteLayout).mockResolvedValue({} as any);
    const result = await deleteLayout(mockPrisma, LAYOUT_ID, 'ws-1');
    expect(result.success).toBe(true);
  });

  it('throws 404 when layout not found', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue(null);
    await expect(deleteLayout(mockPrisma, LAYOUT_ID, 'ws-1')).rejects.toThrow();
  });

  it('allows delete when used by exactly one schedule and scheduleId matches', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue({
      ...minimalLayout,
      schedules: [{ id: SCHED_ID, name: 'My Schedule' }],
    });
    vi.mocked(repo.deleteLayout).mockResolvedValue({} as any);
    await expect(deleteLayout(mockPrisma, LAYOUT_ID, 'ws-1', SCHED_ID)).resolves.not.toThrow();
  });

  it('throws LayoutConflictError when used by one schedule and scheduleId is not provided', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue({
      ...minimalLayout,
      schedules: [{ id: SCHED_ID, name: 'My Schedule' }],
    });
    await expect(deleteLayout(mockPrisma, LAYOUT_ID, 'ws-1')).rejects.toThrow(LayoutConflictError);
  });

  it('throws LayoutConflictError when used by two or more schedules', async () => {
    vi.mocked(repo.getLayoutById).mockResolvedValue({
      ...minimalLayout,
      schedules: [
        { id: SCHED_ID, name: 'Schedule A' },
        { id: 'other-sched', name: 'Schedule B' },
      ],
    });
    await expect(deleteLayout(mockPrisma, LAYOUT_ID, 'ws-1', SCHED_ID)).rejects.toThrow(LayoutConflictError);
  });
});
