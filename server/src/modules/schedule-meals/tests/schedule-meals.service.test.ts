import { describe, it, expect, vi } from 'vitest';
import { patchScheduleMeal, clearScheduleMealRecipes } from '../schedule-meals.service';
import * as repo from '../schedule-meals.repository';
import * as layoutRepo from '../../layouts/layouts.repository';
import * as recipeRepo from '../../recipes/recipes.repository';

vi.mock('../schedule-meals.repository');
vi.mock('../../layouts/layouts.repository');
vi.mock('../../recipes/recipes.repository');

const mockPrisma = {} as any;
const WS_ID = 'ws-1';
const MEAL_ID = 'meal-1';
const MT_ID = 'mt-lunch';
const DT_ID = 'dt-main';
const LAYOUT_ID = 'layout-1';
const RECIPE_ID = 'recipe-1';

const mockMeal = {
  id: MEAL_ID,
  meal_type_id: MT_ID,
  is_locked: false,
  is_manually_edited: false,
  meal_type: { id: MT_ID, name: 'Lunch' },
  meal_recipes: [],
  schedule_day: {
    date: new Date('2026-03-01'), // Sunday (day 0)
    schedule: { workspace_id: WS_ID, layout_id: LAYOUT_ID },
  },
};

const mockLayout = {
  id: LAYOUT_ID,
  name: 'Layout',
  schedules: [],
  week_days_layouts: [
    {
      id: 'wdl-1',
      days: [0], // Sunday
      meal_slots: [
        {
          id: 'slot-1',
          order: 0,
          meal_type_id: MT_ID,
          meal_type: { id: MT_ID, name: 'Lunch' },
          dish_allocations: [
            { id: 'da-1', dish_type_id: DT_ID, amount: 1, dish_type: { id: DT_ID, name: 'Main' } },
          ],
        },
      ],
    },
  ],
};

const mockRecipe = {
  id: RECIPE_ID,
  recipe_meal_types: [{ meal_type_id: MT_ID }],
  recipe_dish_types: [{ dish_type_id: DT_ID }],
};

const mockUpdatedMeal = {
  id: MEAL_ID,
  meal_type_id: MT_ID,
  is_locked: false,
  is_manually_edited: true,
  meal_type: { id: MT_ID, name: 'Lunch' },
  meal_recipes: [
    {
      id: 'mr-1',
      recipe_id: RECIPE_ID,
      dish_type_id: DT_ID,
      recipe: { name: 'Test Recipe' },
      dish_type: { id: DT_ID, name: 'Main' },
    },
  ],
};

describe('patchScheduleMeal', () => {
  it('updates isLocked when only isLocked is provided', async () => {
    vi.mocked(repo.getScheduleMealWithContext).mockResolvedValue(mockMeal);
    vi.mocked(repo.updateScheduleMeal).mockResolvedValue({ ...mockUpdatedMeal, is_locked: true, meal_recipes: [] });

    const result = await patchScheduleMeal(mockPrisma, MEAL_ID, WS_ID, { isLocked: true });
    expect(result.is_locked).toBe(true);
    expect(repo.updateScheduleMeal).toHaveBeenCalledWith(mockPrisma, MEAL_ID, {
      isLocked: true,
      recipes: undefined,
    });
  });

  it('assigns recipes to dish slots when recipeIds provided', async () => {
    vi.mocked(repo.getScheduleMealWithContext).mockResolvedValue(mockMeal);
    vi.mocked(layoutRepo.getLayoutById).mockResolvedValue(mockLayout as any);
    vi.mocked(recipeRepo.getRecipesByIds).mockResolvedValue([mockRecipe]);
    vi.mocked(repo.updateScheduleMeal).mockResolvedValue(mockUpdatedMeal);

    const result = await patchScheduleMeal(mockPrisma, MEAL_ID, WS_ID, { recipeIds: [RECIPE_ID] });
    expect(result.meal_recipes).toHaveLength(1);
    expect(repo.updateScheduleMeal).toHaveBeenCalledWith(mockPrisma, MEAL_ID, {
      isLocked: undefined,
      recipes: [{ recipeId: RECIPE_ID, dishTypeId: DT_ID }],
    });
  });

  it('sends empty recipes array when recipeIds is empty', async () => {
    vi.mocked(repo.getScheduleMealWithContext).mockResolvedValue(mockMeal);
    vi.mocked(layoutRepo.getLayoutById).mockResolvedValue(mockLayout as any);
    vi.mocked(repo.updateScheduleMeal).mockResolvedValue({ ...mockUpdatedMeal, meal_recipes: [] });

    await patchScheduleMeal(mockPrisma, MEAL_ID, WS_ID, { recipeIds: [] });
    expect(repo.updateScheduleMeal).toHaveBeenCalledWith(mockPrisma, MEAL_ID, {
      isLocked: undefined,
      recipes: [],
    });
  });

  it('throws 404 when meal not found', async () => {
    vi.mocked(repo.getScheduleMealWithContext).mockResolvedValue(null);
    await expect(patchScheduleMeal(mockPrisma, MEAL_ID, WS_ID, { isLocked: true })).rejects.toThrow();
  });

  it('throws 422 when recipe does not support the meal type', async () => {
    vi.mocked(repo.getScheduleMealWithContext).mockResolvedValue(mockMeal);
    vi.mocked(layoutRepo.getLayoutById).mockResolvedValue(mockLayout as any);
    vi.mocked(recipeRepo.getRecipesByIds).mockResolvedValue([
      { id: RECIPE_ID, recipe_meal_types: [{ meal_type_id: 'mt-other' }], recipe_dish_types: [{ dish_type_id: DT_ID }] },
    ]);

    await expect(patchScheduleMeal(mockPrisma, MEAL_ID, WS_ID, { recipeIds: [RECIPE_ID] })).rejects.toThrow();
  });

  it('throws 422 when recipe not found in workspace', async () => {
    vi.mocked(repo.getScheduleMealWithContext).mockResolvedValue(mockMeal);
    vi.mocked(layoutRepo.getLayoutById).mockResolvedValue(mockLayout as any);
    vi.mocked(recipeRepo.getRecipesByIds).mockResolvedValue([]); // recipe not found

    await expect(patchScheduleMeal(mockPrisma, MEAL_ID, WS_ID, { recipeIds: [RECIPE_ID] })).rejects.toThrow();
  });

  it('throws 422 when duplicate recipeIds in request', async () => {
    vi.mocked(repo.getScheduleMealWithContext).mockResolvedValue(mockMeal);
    await expect(
      patchScheduleMeal(mockPrisma, MEAL_ID, WS_ID, { recipeIds: [RECIPE_ID, RECIPE_ID] }),
    ).rejects.toThrow();
  });
});

describe('clearScheduleMealRecipes', () => {
  it('clears recipes and returns updated meal', async () => {
    vi.mocked(repo.getScheduleMealWithContext).mockResolvedValue(mockMeal);
    vi.mocked(repo.clearScheduleMealRecipes).mockResolvedValue({
      ...mockUpdatedMeal,
      is_locked: false,
      meal_recipes: [],
    });

    const result = await clearScheduleMealRecipes(mockPrisma, MEAL_ID, WS_ID);
    expect(result.meal_recipes).toHaveLength(0);
    expect(result.is_locked).toBe(false);
  });

  it('throws 404 when meal not found', async () => {
    vi.mocked(repo.getScheduleMealWithContext).mockResolvedValue(null);
    await expect(clearScheduleMealRecipes(mockPrisma, MEAL_ID, WS_ID)).rejects.toThrow();
  });
});
