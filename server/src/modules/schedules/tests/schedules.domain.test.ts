import { describe, it, expect } from 'vitest';
import { validateScheduleDateRange } from '../domain/schedules.rules';
import { generateSchedule } from '../domain/schedules.algorithms';
import type { AlgorithmInput } from '../domain/schedules.algorithms';

// ---------------------------------------------------------------------------
// validateScheduleDateRange
// ---------------------------------------------------------------------------

describe('validateScheduleDateRange', () => {
  it('returns valid for a normal range', () => {
    const result = validateScheduleDateRange(new Date('2026-01-01'), new Date('2026-02-01'));
    expect(result.valid).toBe(true);
  });

  it('returns invalid when endDate equals startDate', () => {
    const result = validateScheduleDateRange(new Date('2026-01-01'), new Date('2026-01-01'));
    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('returns invalid when endDate is before startDate', () => {
    const result = validateScheduleDateRange(new Date('2026-02-01'), new Date('2026-01-01'));
    expect(result.valid).toBe(false);
  });

  it('returns valid for exactly 90-day range', () => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-04-01'); // 90 days
    const result = validateScheduleDateRange(start, end);
    expect(result.valid).toBe(true);
  });

  it('returns invalid when range exceeds 90 days', () => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-05-01'); // >90 days
    const result = validateScheduleDateRange(start, end);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/90/);
  });
});

// ---------------------------------------------------------------------------
// generateSchedule
// ---------------------------------------------------------------------------

const baseInput = (): AlgorithmInput => ({
  startDate: new Date('2026-03-01'),
  endDate: new Date('2026-03-07'),
  weekDaysLayouts: [
    {
      days: [0, 1, 2, 3, 4, 5, 6],
      mealSlots: [
        {
          mealTypeId: 'mt-lunch',
          dishAllocations: [{ dishTypeId: 'dt-main', amount: 1 }],
        },
      ],
    },
  ],
  settings: {
    recipeGap: 0,
    mainIngGap: 0,
    isAllowSameDayIng: true,
    blockedMeals: [],
  },
  recipes: [
    { id: 'r1', mealTypeIds: ['mt-lunch'], dishTypeIds: ['dt-main'], mainIngredientId: 'ing-1' },
    { id: 'r2', mealTypeIds: ['mt-lunch'], dishTypeIds: ['dt-main'], mainIngredientId: 'ing-2' },
    { id: 'r3', mealTypeIds: ['mt-lunch'], dishTypeIds: ['dt-main'], mainIngredientId: 'ing-3' },
  ],
  lockedMeals: [],
});

describe('generateSchedule — basic generation', () => {
  it('generates meals for every day in range', () => {
    const output = generateSchedule(baseInput());
    expect(output.days).toHaveLength(7);
    output.days.forEach((d) => {
      expect(d.meals).toHaveLength(1);
      expect(d.meals[0].recipes).toHaveLength(1);
    });
  });

  it('counts requestedDays correctly', () => {
    const output = generateSchedule(baseInput());
    expect(output.summary.requestedDays).toBe(7);
  });

  it('counts processedMealSlots correctly', () => {
    const output = generateSchedule(baseInput());
    expect(output.summary.processedMealSlots).toBe(7);
  });

  it('counts generatedMealSlots correctly when all slots filled', () => {
    const output = generateSchedule(baseInput());
    expect(output.summary.generatedMealSlots).toBe(7);
    expect(output.summary.partialMealSlots).toBe(0);
    expect(output.summary.emptyMealSlots).toBe(0);
  });

  it('skips days with no matching weekDaysLayout', () => {
    const input = baseInput();
    input.weekDaysLayouts[0].days = [1]; // Only Monday
    input.startDate = new Date('2026-03-02'); // Monday
    input.endDate = new Date('2026-03-08'); // Sunday
    const output = generateSchedule(input);
    // Only Monday (3/2) should be in resultDays
    expect(output.days).toHaveLength(1);
    expect(output.days[0].date).toBe('2026-03-02');
  });
});

describe('generateSchedule — LRU (least-recently-used) ordering', () => {
  it('picks the least recently used recipe first', () => {
    const input = baseInput();
    input.lockedMeals = [
      {
        date: '2026-02-28',
        mealTypeId: 'mt-lunch',
        recipeIds: ['r1'],
        mainIngredientIds: ['ing-1'],
        recipes: [{ recipeId: 'r1', dishTypeId: 'dt-main' }],
      },
    ];
    const output = generateSchedule(input);
    // r1 was used yesterday, so r2 or r3 should be picked first
    expect(['r2', 'r3']).toContain(output.days[0].meals[0].recipes[0].recipeId);
  });
});

describe('generateSchedule — recipeGap', () => {
  it('excludes recipes used within recipeGap days', () => {
    const input = baseInput();
    input.settings.recipeGap = 3;
    input.lockedMeals = [
      {
        date: '2026-03-01',
        mealTypeId: 'mt-lunch',
        recipeIds: ['r1'],
        mainIngredientIds: ['ing-1'],
        recipes: [{ recipeId: 'r1', dishTypeId: 'dt-main' }],
      },
    ];
    // On 2026-03-02 (day after lock), r1 should be excluded
    const output = generateSchedule(input);
    const day2 = output.days.find((d) => d.date === '2026-03-02');
    expect(day2?.meals[0].recipes[0].recipeId).not.toBe('r1');
  });
});

describe('generateSchedule — mainIngGap', () => {
  it('excludes recipes whose main ingredient was used within mainIngGap days', () => {
    const input = baseInput();
    input.settings.mainIngGap = 3;
    // r1 and r4 both share ing-1
    input.recipes.push({
      id: 'r4',
      mealTypeIds: ['mt-lunch'],
      dishTypeIds: ['dt-main'],
      mainIngredientId: 'ing-1',
    });
    input.lockedMeals = [
      {
        date: '2026-03-01',
        mealTypeId: 'mt-lunch',
        recipeIds: ['r1'],
        mainIngredientIds: ['ing-1'],
        recipes: [{ recipeId: 'r1', dishTypeId: 'dt-main' }],
      },
    ];
    const output = generateSchedule(input);
    // On 2026-03-02, both r1 and r4 (same mainIngredient ing-1) should be excluded
    const day2 = output.days.find((d) => d.date === '2026-03-02');
    const pickedId = day2?.meals[0].recipes[0].recipeId;
    expect(['r2', 'r3']).toContain(pickedId);
  });
});

describe('generateSchedule — isAllowSameDayIng = false', () => {
  it('prevents same main ingredient in different meals on the same day', () => {
    const input: AlgorithmInput = {
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-01'),
      weekDaysLayouts: [
        {
          days: [0],
          mealSlots: [
            {
              mealTypeId: 'mt-lunch',
              dishAllocations: [{ dishTypeId: 'dt-main', amount: 1 }],
            },
            {
              mealTypeId: 'mt-dinner',
              dishAllocations: [{ dishTypeId: 'dt-main', amount: 1 }],
            },
          ],
        },
      ],
      settings: {
        recipeGap: 0,
        mainIngGap: 0,
        isAllowSameDayIng: false,
        blockedMeals: [],
      },
      recipes: [
        { id: 'r1', mealTypeIds: ['mt-lunch', 'mt-dinner'], dishTypeIds: ['dt-main'], mainIngredientId: 'ing-shared' },
        { id: 'r2', mealTypeIds: ['mt-dinner'], dishTypeIds: ['dt-main'], mainIngredientId: 'ing-different' },
      ],
      lockedMeals: [],
    };
    const output = generateSchedule(input);
    const day = output.days[0];
    const lunchRecipeId = day.meals.find((m) => m.mealTypeId === 'mt-lunch')?.recipes[0]?.recipeId;
    const dinnerRecipeId = day.meals.find((m) => m.mealTypeId === 'mt-dinner')?.recipes[0]?.recipeId;
    // Lunch takes r1, dinner must use r2 (different ingredient)
    expect(lunchRecipeId).toBe('r1');
    expect(dinnerRecipeId).toBe('r2');
  });
});

describe('generateSchedule — blocked and locked meals', () => {
  it('skips blocked meal slots', () => {
    const input = baseInput();
    input.settings.blockedMeals = [{ date: '2026-03-01', mealTypeIds: ['mt-lunch'] }];
    const output = generateSchedule(input);
    const day1 = output.days.find((d) => d.date === '2026-03-01');
    expect(day1).toBeUndefined();
    expect(output.summary.skippedBlockedMealSlots).toBe(1);
  });

  it('includes locked meals with their recipes', () => {
    const input = baseInput();
    input.lockedMeals = [
      {
        date: '2026-03-01',
        mealTypeId: 'mt-lunch',
        recipeIds: ['r1'],
        mainIngredientIds: ['ing-1'],
        recipes: [{ recipeId: 'r1', dishTypeId: 'dt-main' }],
      },
    ];
    const output = generateSchedule(input);
    const day1 = output.days.find((d) => d.date === '2026-03-01');
    expect(day1?.meals[0].isLocked).toBe(true);
    expect(day1?.meals[0].recipes[0].recipeId).toBe('r1');
    expect(output.summary.skippedLockedMealSlots).toBe(1);
  });
});

describe('generateSchedule — partial / empty slots', () => {
  it('emits emptyMealSlots when no eligible recipe exists', () => {
    const input = baseInput();
    input.recipes = []; // No recipes
    const output = generateSchedule(input);
    expect(output.summary.emptyMealSlots).toBe(7);
    expect(output.summary.generatedMealSlots).toBe(0);
  });

  it('emits partialMealSlots when slot is partially filled', () => {
    const input = baseInput();
    input.weekDaysLayouts[0].mealSlots[0].dishAllocations = [
      { dishTypeId: 'dt-main', amount: 2 }, // needs 2 recipes
    ];
    input.recipes = [
      { id: 'r1', mealTypeIds: ['mt-lunch'], dishTypeIds: ['dt-main'], mainIngredientId: 'ing-1' },
      // Only 1 recipe available — can fill once, second fill fails
    ];
    const output = generateSchedule(input);
    // 7 days, each needs 2 fills but only 1 recipe → partial on first day (r1 used), empty on rest
    expect(output.summary.partialMealSlots).toBeGreaterThan(0);
  });

  it('adds a warning when partialMealSlots > 0', () => {
    const input = baseInput();
    input.weekDaysLayouts[0].mealSlots[0].dishAllocations = [
      { dishTypeId: 'dt-main', amount: 2 },
    ];
    input.recipes = [
      { id: 'r1', mealTypeIds: ['mt-lunch'], dishTypeIds: ['dt-main'], mainIngredientId: 'ing-1' },
    ];
    const output = generateSchedule(input);
    const codes = output.warnings.map((w) => w.code);
    expect(codes).toContain('partial_assignment');
  });

  it('adds empty_assignment warning when no recipe fills a slot at all', () => {
    const input = baseInput();
    input.recipes = [];
    const output = generateSchedule(input);
    const codes = output.warnings.map((w) => w.code);
    expect(codes).toContain('empty_assignment');
  });
});

describe('generateSchedule — no same-recipe in same meal', () => {
  it('does not assign the same recipe twice in the same meal', () => {
    const input: AlgorithmInput = {
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-01'),
      weekDaysLayouts: [
        {
          days: [0],
          mealSlots: [
            {
              mealTypeId: 'mt-lunch',
              dishAllocations: [{ dishTypeId: 'dt-main', amount: 2 }],
            },
          ],
        },
      ],
      settings: {
        recipeGap: 0,
        mainIngGap: 0,
        isAllowSameDayIng: true,
        blockedMeals: [],
      },
      recipes: [
        { id: 'r1', mealTypeIds: ['mt-lunch'], dishTypeIds: ['dt-main'], mainIngredientId: 'ing-1' },
        { id: 'r2', mealTypeIds: ['mt-lunch'], dishTypeIds: ['dt-main'], mainIngredientId: 'ing-2' },
      ],
      lockedMeals: [],
    };
    const output = generateSchedule(input);
    const recipes = output.days[0].meals[0].recipes;
    const ids = recipes.map((r) => r.recipeId);
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });
});
