import { describe, it, expect, vi } from 'vitest';
import {
  listRecipes,
  fetchRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from '../recipes.service';
import * as repo from '../recipes.repository';
import * as dishTypeRepo from '../../dish-types/dish-types.repository';
import * as mealTypeRepo from '../../meal-types/meal-types.repository';
import * as ingredientRepo from '../../ingredients/ingredients.repository';
import { ScheduleConflictError } from '../../../utils/errors';

vi.mock('../recipes.repository');
vi.mock('../../dish-types/dish-types.repository');
vi.mock('../../meal-types/meal-types.repository');
vi.mock('../../ingredients/ingredients.repository');

const mockPrisma = {} as any;
const WS_ID = 'ws-1';
const RECIPE_ID = 'recipe-1';
const DT_ID = 'dt-1';
const MT_ID = 'mt-1';
const ING_ID = 'ing-1';

const mockRecipeRow = {
  id: RECIPE_ID,
  name: 'Test Recipe',
  instructions: null,
  recipe_dish_types: [{ dish_type: { id: DT_ID, name: 'Main Course' } }],
  recipe_meal_types: [{ meal_type: { id: MT_ID, name: 'Lunch' } }],
  recipe_ingredients: [
    {
      id: 'ri-1',
      is_main: true,
      display_name: null,
      amount: null,
      ingredient: { id: ING_ID, name: 'Chicken' },
      unit: null,
    },
  ],
};

const mockCreateBody = {
  name: 'Test Recipe',
  dishTypeIds: [DT_ID],
  mealTypeIds: [MT_ID],
  ingredients: [{ id: ING_ID, isMain: true }],
};

describe('listRecipes', () => {
  it('returns paginated result', async () => {
    vi.mocked(repo.getRecipes).mockResolvedValue({ items: [mockRecipeRow], total: 1 });
    const result = await listRecipes(mockPrisma, WS_ID, { page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });
});

describe('fetchRecipeById', () => {
  it('returns recipe when found', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(mockRecipeRow);
    const result = await fetchRecipeById(mockPrisma, RECIPE_ID, WS_ID);
    expect(result.name).toBe('Test Recipe');
  });

  it('throws 404 when not found', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(null);
    await expect(fetchRecipeById(mockPrisma, RECIPE_ID, WS_ID)).rejects.toThrow();
  });
});

describe('createRecipe', () => {
  it('creates and returns recipe', async () => {
    vi.mocked(dishTypeRepo.getDishTypesByIds).mockResolvedValue([{ id: DT_ID }]);
    vi.mocked(mealTypeRepo.getMealTypesByIds).mockResolvedValue([{ id: MT_ID }]);
    vi.mocked(ingredientRepo.getIngredientsByIds).mockResolvedValue([{ id: ING_ID }]);
    vi.mocked(ingredientRepo.getVariantsByIds).mockResolvedValue([]);
    vi.mocked(repo.getUnitsByNames).mockResolvedValue([]);
    vi.mocked(repo.createRecipe).mockResolvedValue(mockRecipeRow);

    const result = await createRecipe(mockPrisma, WS_ID, mockCreateBody);
    expect(result.name).toBe('Test Recipe');
  });

  it('throws ruleViolationError when no ingredient is main', async () => {
    await expect(
      createRecipe(mockPrisma, WS_ID, {
        ...mockCreateBody,
        ingredients: [{ id: ING_ID, isMain: false }],
      }),
    ).rejects.toThrow();
  });

  it('throws ruleViolationError when multiple ingredients are main', async () => {
    await expect(
      createRecipe(mockPrisma, WS_ID, {
        ...mockCreateBody,
        ingredients: [
          { id: ING_ID, isMain: true },
          { id: 'ing-2', isMain: true },
        ],
      }),
    ).rejects.toThrow();
  });

  it('throws notFoundError when dish type not in workspace', async () => {
    vi.mocked(dishTypeRepo.getDishTypesByIds).mockResolvedValue([]);
    vi.mocked(mealTypeRepo.getMealTypesByIds).mockResolvedValue([{ id: MT_ID }]);
    vi.mocked(ingredientRepo.getIngredientsByIds).mockResolvedValue([{ id: ING_ID }]);
    vi.mocked(ingredientRepo.getVariantsByIds).mockResolvedValue([]);
    vi.mocked(repo.getUnitsByNames).mockResolvedValue([]);

    await expect(createRecipe(mockPrisma, WS_ID, mockCreateBody)).rejects.toThrow();
  });

  it('throws notFoundError when ingredient not in workspace', async () => {
    vi.mocked(dishTypeRepo.getDishTypesByIds).mockResolvedValue([{ id: DT_ID }]);
    vi.mocked(mealTypeRepo.getMealTypesByIds).mockResolvedValue([{ id: MT_ID }]);
    vi.mocked(ingredientRepo.getIngredientsByIds).mockResolvedValue([]);
    vi.mocked(ingredientRepo.getVariantsByIds).mockResolvedValue([]);
    vi.mocked(repo.getUnitsByNames).mockResolvedValue([]);

    await expect(createRecipe(mockPrisma, WS_ID, mockCreateBody)).rejects.toThrow();
  });

  it('throws invalidRequestError when variant does not match ingredient', async () => {
    vi.mocked(dishTypeRepo.getDishTypesByIds).mockResolvedValue([{ id: DT_ID }]);
    vi.mocked(mealTypeRepo.getMealTypesByIds).mockResolvedValue([{ id: MT_ID }]);
    vi.mocked(ingredientRepo.getIngredientsByIds).mockResolvedValue([{ id: ING_ID }]);
    vi.mocked(ingredientRepo.getVariantsByIds).mockResolvedValue([
      { id: 'var-1', variant: 'Grilled', ingredient_id: 'different-ing' },
    ]);
    vi.mocked(repo.getUnitsByNames).mockResolvedValue([]);

    await expect(
      createRecipe(mockPrisma, WS_ID, {
        ...mockCreateBody,
        ingredients: [{ id: ING_ID, isMain: true, variantId: 'var-1' }],
      }),
    ).rejects.toThrow();
  });

  it('throws conflictError on P2002', async () => {
    vi.mocked(dishTypeRepo.getDishTypesByIds).mockResolvedValue([{ id: DT_ID }]);
    vi.mocked(mealTypeRepo.getMealTypesByIds).mockResolvedValue([{ id: MT_ID }]);
    vi.mocked(ingredientRepo.getIngredientsByIds).mockResolvedValue([{ id: ING_ID }]);
    vi.mocked(ingredientRepo.getVariantsByIds).mockResolvedValue([]);
    vi.mocked(repo.getUnitsByNames).mockResolvedValue([]);
    vi.mocked(repo.createRecipe).mockRejectedValue({ code: 'P2002' });

    await expect(createRecipe(mockPrisma, WS_ID, mockCreateBody)).rejects.toThrow();
  });
});

describe('updateRecipe', () => {
  it('throws 404 when recipe not found', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(null);
    await expect(updateRecipe(mockPrisma, RECIPE_ID, WS_ID, { name: 'New' })).rejects.toThrow();
  });

  it('updates and returns recipe', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(mockRecipeRow);
    vi.mocked(repo.getRecipeMealRecipes).mockResolvedValue([]);
    vi.mocked(dishTypeRepo.getDishTypesByIds).mockResolvedValue([{ id: DT_ID }]);
    vi.mocked(repo.updateRecipe).mockResolvedValue({ ...mockRecipeRow, name: 'Updated' });

    const result = await updateRecipe(mockPrisma, RECIPE_ID, WS_ID, { dishTypeIds: [DT_ID] });
    expect(result.name).toBe('Updated');
  });

  it('throws ruleViolationError when updating ingredients without exactly one main', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(mockRecipeRow);

    await expect(
      updateRecipe(mockPrisma, RECIPE_ID, WS_ID, {
        ingredients: [{ id: ING_ID, isMain: false }],
      }),
    ).rejects.toThrow();
  });

  it('throws ScheduleConflictError when dish type change conflicts with future meals', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(mockRecipeRow);
    vi.mocked(dishTypeRepo.getDishTypesByIds).mockResolvedValue([{ id: 'new-dt' }]);
    vi.mocked(repo.getRecipeMealRecipes).mockResolvedValue([
      {
        dish_type_id: DT_ID,
        schedule_meal: {
          meal_type_id: MT_ID,
          schedule_day: {
            date: new Date('2099-06-15'),
            schedule: { id: 'sched-1', name: 'Summer Plan' },
          },
        },
      },
    ]);

    await expect(
      updateRecipe(mockPrisma, RECIPE_ID, WS_ID, { dishTypeIds: ['new-dt'] }),
    ).rejects.toBeInstanceOf(ScheduleConflictError);
  });

  it('throws ScheduleConflictError when meal type change conflicts with future meals', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(mockRecipeRow);
    vi.mocked(mealTypeRepo.getMealTypesByIds).mockResolvedValue([{ id: 'new-mt' }]);
    vi.mocked(repo.getRecipeMealRecipes).mockResolvedValue([
      {
        dish_type_id: DT_ID,
        schedule_meal: {
          meal_type_id: MT_ID,
          schedule_day: {
            date: new Date('2099-06-15'),
            schedule: { id: 'sched-1', name: 'Summer Plan' },
          },
        },
      },
    ]);

    await expect(
      updateRecipe(mockPrisma, RECIPE_ID, WS_ID, { mealTypeIds: ['new-mt'] }),
    ).rejects.toBeInstanceOf(ScheduleConflictError);
  });

  it('does not conflict on past meal assignments', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(mockRecipeRow);
    vi.mocked(dishTypeRepo.getDishTypesByIds).mockResolvedValue([{ id: 'new-dt' }]);
    vi.mocked(repo.getRecipeMealRecipes).mockResolvedValue([
      {
        dish_type_id: DT_ID,
        schedule_meal: {
          meal_type_id: MT_ID,
          schedule_day: {
            date: new Date('2000-01-01'),
            schedule: { id: 'sched-1', name: 'Old Plan' },
          },
        },
      },
    ]);
    vi.mocked(repo.updateRecipe).mockResolvedValue(mockRecipeRow);

    await expect(
      updateRecipe(mockPrisma, RECIPE_ID, WS_ID, { dishTypeIds: ['new-dt'] }),
    ).resolves.toBeDefined();
  });
});

describe('deleteRecipe', () => {
  it('throws 404 when recipe not found', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(null);
    await expect(deleteRecipe(mockPrisma, RECIPE_ID, WS_ID)).rejects.toThrow();
  });

  it('throws ScheduleConflictError when recipe is in use', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(mockRecipeRow);
    vi.mocked(repo.getRecipeMealRecipes).mockResolvedValue([
      {
        dish_type_id: DT_ID,
        schedule_meal: {
          meal_type_id: MT_ID,
          schedule_day: {
            date: new Date('2099-06-15'),
            schedule: { id: 'sched-1', name: 'Summer Plan' },
          },
        },
      },
    ]);

    await expect(deleteRecipe(mockPrisma, RECIPE_ID, WS_ID)).rejects.toBeInstanceOf(
      ScheduleConflictError,
    );
  });

  it('deletes and returns success when not in use', async () => {
    vi.mocked(repo.getRecipeById).mockResolvedValue(mockRecipeRow);
    vi.mocked(repo.getRecipeMealRecipes).mockResolvedValue([]);
    vi.mocked(repo.deleteRecipe).mockResolvedValue({
      id: RECIPE_ID,
      name: 'Test Recipe',
      instructions: null,
      workspace_id: WS_ID,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await deleteRecipe(mockPrisma, RECIPE_ID, WS_ID);
    expect(result.success).toBe(true);
  });
});
