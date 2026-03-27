import { describe, it, expect, vi } from 'vitest';
import {
  listSchedules,
  fetchScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  fetchScheduleSettings,
  fetchScheduleCalendar,
  generateScheduleService,
} from '../schedules.service';
import * as repo from '../schedules.repository';
import * as layoutRepo from '../../layouts/layouts.repository';
import * as recipeRepo from '../../recipes/recipes.repository';

vi.mock('../schedules.repository');
vi.mock('../../layouts/layouts.repository');
vi.mock('../../recipes/recipes.repository');

const mockPrisma = {} as any;
const WS_ID = 'ws-1';
const SCHED_ID = 'sched-1';
const LAYOUT_ID = 'layout-1';

const mockScheduleRow = {
  id: SCHED_ID,
  name: 'Test Schedule',
  layout_id: LAYOUT_ID,
  start_date: new Date('2026-03-01'),
  end_date: new Date('2026-04-01'),
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const mockLayout = {
  id: LAYOUT_ID,
  name: 'Layout',
  schedules: [],
  week_days_layouts: [
    {
      id: 'wdl-1',
      days: [0, 1, 2, 3, 4, 5, 6],
      meal_slots: [
        {
          id: 'slot-1',
          order: 0,
          meal_type_id: 'mt-1',
          meal_type: { id: 'mt-1', name: 'Lunch' },
          dish_allocations: [
            { id: 'da-1', dish_type_id: 'dt-1', amount: 1, dish_type: { id: 'dt-1', name: 'Main' } },
          ],
        },
      ],
    },
  ],
};

describe('listSchedules', () => {
  it('returns paginated result', async () => {
    vi.mocked(repo.getSchedules).mockResolvedValue({ items: [mockScheduleRow], total: 1 });
    const result = await listSchedules(mockPrisma, WS_ID, { page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });
});

describe('fetchScheduleById', () => {
  it('returns schedule when found', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    const result = await fetchScheduleById(mockPrisma, SCHED_ID, WS_ID);
    expect(result.name).toBe('Test Schedule');
  });

  it('throws 404 when not found', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(null);
    await expect(fetchScheduleById(mockPrisma, SCHED_ID, WS_ID)).rejects.toThrow();
  });
});

describe('createSchedule', () => {
  it('creates and returns schedule', async () => {
    vi.mocked(layoutRepo.getLayoutById).mockResolvedValue(mockLayout);
    vi.mocked(repo.getOverlappingSchedules).mockResolvedValue([]);
    vi.mocked(repo.createSchedule).mockResolvedValue(mockScheduleRow);

    const result = await createSchedule(mockPrisma, WS_ID, {
      name: 'New Schedule',
      layoutId: LAYOUT_ID,
      startDate: '2026-03-01',
      endDate: '2026-04-01',
    });
    expect(result.name).toBe('Test Schedule');
  });

  it('throws rule violation when endDate <= startDate', async () => {
    await expect(
      createSchedule(mockPrisma, WS_ID, {
        name: 'Bad',
        layoutId: LAYOUT_ID,
        startDate: '2026-03-01',
        endDate: '2026-03-01',
      }),
    ).rejects.toThrow();
  });

  it('throws rule violation when range exceeds 90 days', async () => {
    await expect(
      createSchedule(mockPrisma, WS_ID, {
        name: 'Too Long',
        layoutId: LAYOUT_ID,
        startDate: '2026-01-01',
        endDate: '2026-06-01',
      }),
    ).rejects.toThrow();
  });

  it('throws 400 when layoutId not found in workspace', async () => {
    vi.mocked(layoutRepo.getLayoutById).mockResolvedValue(null);
    await expect(
      createSchedule(mockPrisma, WS_ID, {
        name: 'Bad',
        layoutId: LAYOUT_ID,
        startDate: '2026-03-01',
        endDate: '2026-04-01',
      }),
    ).rejects.toThrow();
  });

  it('throws 409 when dates overlap an existing schedule', async () => {
    vi.mocked(layoutRepo.getLayoutById).mockResolvedValue(mockLayout);
    vi.mocked(repo.getOverlappingSchedules).mockResolvedValue([mockScheduleRow]);

    await expect(
      createSchedule(mockPrisma, WS_ID, {
        name: 'Overlap',
        layoutId: LAYOUT_ID,
        startDate: '2026-03-15',
        endDate: '2026-04-15',
      }),
    ).rejects.toThrow();
  });
});

describe('updateSchedule', () => {
  it('throws 404 when schedule not found', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(null);
    await expect(updateSchedule(mockPrisma, SCHED_ID, WS_ID, { name: 'X' })).rejects.toThrow();
  });

  it('updates and returns schedule', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    vi.mocked(repo.updateSchedule).mockResolvedValue({ ...mockScheduleRow, name: 'Renamed' });
    const result = await updateSchedule(mockPrisma, SCHED_ID, WS_ID, { name: 'Renamed' });
    expect(result.name).toBe('Renamed');
  });
});

describe('deleteSchedule', () => {
  it('throws 404 when schedule not found', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(null);
    await expect(deleteSchedule(mockPrisma, SCHED_ID, WS_ID)).rejects.toThrow();
  });

  it('deletes and returns success', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    vi.mocked(repo.deleteSchedule).mockResolvedValue(mockScheduleRow as any);
    const result = await deleteSchedule(mockPrisma, SCHED_ID, WS_ID);
    expect(result.success).toBe(true);
  });
});

describe('fetchScheduleSettings', () => {
  it('throws 404 when schedule not found', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(null);
    await expect(fetchScheduleSettings(mockPrisma, SCHED_ID, WS_ID)).rejects.toThrow();
  });

  it('throws 404 when settings not yet saved', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    vi.mocked(repo.getScheduleSettings).mockResolvedValue(null);
    await expect(fetchScheduleSettings(mockPrisma, SCHED_ID, WS_ID)).rejects.toThrow();
  });

  it('returns settings when found', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    vi.mocked(repo.getScheduleSettings).mockResolvedValue({
      recipe_gap: 3,
      main_ing_gap: 7,
      is_allow_same_day_ing: false,
      blocked_meals: [],
    });
    const result = await fetchScheduleSettings(mockPrisma, SCHED_ID, WS_ID);
    expect(result.recipe_gap).toBe(3);
  });
});

describe('fetchScheduleCalendar', () => {
  it('throws 404 when schedule not found', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(null);
    await expect(
      fetchScheduleCalendar(mockPrisma, SCHED_ID, WS_ID, '2026-03-15'),
    ).rejects.toThrow();
  });

  it('throws 400 when anchorDate is outside schedule range', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    await expect(
      fetchScheduleCalendar(mockPrisma, SCHED_ID, WS_ID, '2025-01-01'),
    ).rejects.toThrow();
  });

  it('returns calendar with 21-day window clamped to schedule bounds', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    vi.mocked(repo.getScheduleCalendar).mockResolvedValue([]);
    const result = await fetchScheduleCalendar(mockPrisma, SCHED_ID, WS_ID, '2026-03-15');
    expect(result.anchorDate).toBe('2026-03-15');
    // window: 2026-03-08 to 2026-03-28 (clamped to schedule 2026-03-01..2026-04-01)
    expect(result.days[0].date).toBe('2026-03-08');
    expect(result.days[result.days.length - 1].date).toBe('2026-03-28');
    expect(result.days).toHaveLength(21);
  });

  it('fills days without ScheduleDay records with empty meals', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    vi.mocked(repo.getScheduleCalendar).mockResolvedValue([]);
    const result = await fetchScheduleCalendar(mockPrisma, SCHED_ID, WS_ID, '2026-03-15');
    result.days.forEach((d) => {
      expect(d.id).toBeNull();
      expect(d.meals).toEqual([]);
    });
  });
});

describe('generateScheduleService', () => {
  it('throws 404 when schedule not found', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(null);
    await expect(
      generateScheduleService(mockPrisma, SCHED_ID, WS_ID, {
        layoutId: LAYOUT_ID,
        settings: { recipeGap: 3, mainIngGap: 7, isAllowSameDayIng: false },
      }),
    ).rejects.toThrow();
  });

  it('throws 400 when layoutId not found', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    vi.mocked(layoutRepo.getLayoutById).mockResolvedValue(null);
    await expect(
      generateScheduleService(mockPrisma, SCHED_ID, WS_ID, {
        layoutId: LAYOUT_ID,
        settings: { recipeGap: 3, mainIngGap: 7, isAllowSameDayIng: false },
      }),
    ).rejects.toThrow();
  });

  it('throws 400 when blocked meal date is outside schedule range', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    await expect(
      generateScheduleService(mockPrisma, SCHED_ID, WS_ID, {
        layoutId: LAYOUT_ID,
        settings: {
          recipeGap: 3,
          mainIngGap: 7,
          isAllowSameDayIng: false,
          blockedMeals: [{ date: '2025-01-01', mealTypeIds: ['mt-1'] }],
        },
      }),
    ).rejects.toThrow();
  });

  it('runs generation and returns structured result', async () => {
    vi.mocked(repo.getScheduleById).mockResolvedValue(mockScheduleRow);
    vi.mocked(layoutRepo.getLayoutById).mockResolvedValue(mockLayout);
    vi.mocked(recipeRepo.getRecipesForGeneration).mockResolvedValue([]);
    vi.mocked(repo.getLockedMealsForSchedule).mockResolvedValue([]);
    vi.mocked(repo.saveGenerationResult).mockResolvedValue(undefined);
    vi.mocked(repo.getScheduleCalendar).mockResolvedValue([]);

    const result = await generateScheduleService(mockPrisma, SCHED_ID, WS_ID, {
      layoutId: LAYOUT_ID,
      settings: { recipeGap: 3, mainIngGap: 7, isAllowSameDayIng: false },
    });

    expect(result.schedule).toBeDefined();
    expect(result.settings.recipeGap).toBe(3);
    expect(result.calendar.anchorDate).toBe('2026-03-01');
    expect(result.generationSummary).toBeDefined();
    expect(result.warnings).toBeInstanceOf(Array);
  });
});
