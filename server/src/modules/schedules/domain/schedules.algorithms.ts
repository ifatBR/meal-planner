export type RecipeForGeneration = {
  id: string;
  mealTypeIds: string[];
  dishTypeIds: string[];
  mainIngredientId: string | null;
};

export type LockedMealForGeneration = {
  date: string; // YYYY-MM-DD
  mealTypeId: string;
  recipeIds: string[];
  mainIngredientIds: string[];
  recipes: Array<{ recipeId: string; dishTypeId: string }>;
};

export type DishAllocationInput = {
  dishTypeId: string;
  amount: number;
};

export type MealSlotInput = {
  mealTypeId: string;
  dishAllocations: DishAllocationInput[];
};

export type WeekDaysLayoutInput = {
  days: number[];
  mealSlots: MealSlotInput[];
};

export type GenerationSettingsInput = {
  recipeGap: number;
  mainIngGap: number;
  isAllowSameDayIng: boolean;
  blockedMeals: Array<{ date: string; mealTypeIds: string[] }>;
};

export type AlgorithmInput = {
  startDate: Date;
  endDate: Date;
  weekDaysLayouts: WeekDaysLayoutInput[];
  settings: GenerationSettingsInput;
  recipes: RecipeForGeneration[];
  lockedMeals: LockedMealForGeneration[];
};

export type GeneratedRecipe = {
  recipeId: string;
  dishTypeId: string;
};

export type GeneratedMeal = {
  mealTypeId: string;
  recipes: GeneratedRecipe[];
  isLocked: boolean;
};

export type GeneratedDay = {
  date: string;
  meals: GeneratedMeal[];
};

export type AlgorithmOutput = {
  days: GeneratedDay[];
  summary: {
    requestedDays: number;
    processedMealSlots: number;
    generatedMealSlots: number;
    skippedLockedMealSlots: number;
    skippedBlockedMealSlots: number;
    partialMealSlots: number;
    emptyMealSlots: number;
  };
  warnings: Array<{ code: string; message: string }>;
};

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const daysBetween = (a: Date, b: Date): number =>
  Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

export const generateSchedule = (input: AlgorithmInput): AlgorithmOutput => {
  const { startDate, endDate, weekDaysLayouts, settings, recipes, lockedMeals } = input;
  const { recipeGap, mainIngGap, isAllowSameDayIng, blockedMeals } = settings;

  // Track most-recent use date per recipe and per main ingredient
  const recipeHistory = new Map<string, Date>();
  const mainIngHistory = new Map<string, Date>();

  // Pre-populate history from locked meals
  for (const lm of lockedMeals) {
    const date = new Date(lm.date);
    for (const recipeId of lm.recipeIds) {
      const existing = recipeHistory.get(recipeId);
      if (!existing || date > existing) recipeHistory.set(recipeId, date);
    }
    for (const ingId of lm.mainIngredientIds) {
      const existing = mainIngHistory.get(ingId);
      if (!existing || date > existing) mainIngHistory.set(ingId, date);
    }
  }

  // Build lookup sets
  const lockedSet = new Set(lockedMeals.map((lm) => `${lm.date}:${lm.mealTypeId}`));

  const blockedSet = new Set<string>();
  for (const bm of blockedMeals) {
    for (const mealTypeId of bm.mealTypeIds) {
      blockedSet.add(`${bm.date}:${mealTypeId}`);
    }
  }

  const summary = {
    requestedDays: 0,
    processedMealSlots: 0,
    generatedMealSlots: 0,
    skippedLockedMealSlots: 0,
    skippedBlockedMealSlots: 0,
    partialMealSlots: 0,
    emptyMealSlots: 0,
  };
  const warnings: Array<{ code: string; message: string }> = [];
  const resultDays: GeneratedDay[] = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    summary.requestedDays++;
    const dateStr = formatDate(current);
    const dayOfWeek = current.getDay();

    const wdl = weekDaysLayouts.find((l) => l.days.includes(dayOfWeek));
    if (!wdl) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // Track ingredient usage within this day (pre-populate from locked meals)
    const sameDayIngredients = new Set<string>();
    for (const lm of lockedMeals) {
      if (lm.date === dateStr) {
        for (const ingId of lm.mainIngredientIds) {
          sameDayIngredients.add(ingId);
        }
      }
    }

    const dayMeals: GeneratedMeal[] = [];

    for (const slot of wdl.mealSlots) {
      const key = `${dateStr}:${slot.mealTypeId}`;

      if (lockedSet.has(key)) {
        summary.skippedLockedMealSlots++;
        const lockedMeal = lockedMeals.find(
          (lm) => lm.date === dateStr && lm.mealTypeId === slot.mealTypeId,
        );
        dayMeals.push({
          mealTypeId: slot.mealTypeId,
          recipes: lockedMeal?.recipes ?? [],
          isLocked: true,
        });
        continue;
      }

      if (blockedSet.has(key)) {
        summary.skippedBlockedMealSlots++;
        continue;
      }

      summary.processedMealSlots++;

      const mealRecipes: GeneratedRecipe[] = [];
      const usedRecipeIds = new Set<string>();

      for (const dishAlloc of slot.dishAllocations) {
        for (let i = 0; i < dishAlloc.amount; i++) {
          const eligible = recipes.filter((r) => {
            if (!r.mealTypeIds.includes(slot.mealTypeId)) return false;
            if (!r.dishTypeIds.includes(dishAlloc.dishTypeId)) return false;
            if (usedRecipeIds.has(r.id)) return false;

            if (recipeGap > 0) {
              const lastUsed = recipeHistory.get(r.id);
              if (lastUsed && daysBetween(current, lastUsed) < recipeGap) return false;
            }

            if (mainIngGap > 0 && r.mainIngredientId) {
              const lastUsed = mainIngHistory.get(r.mainIngredientId);
              if (lastUsed && daysBetween(current, lastUsed) < mainIngGap) return false;
            }

            if (!isAllowSameDayIng && r.mainIngredientId) {
              if (sameDayIngredients.has(r.mainIngredientId)) return false;
            }

            return true;
          });

          if (eligible.length === 0) continue;

          // Pick least-recently-used recipe to maximise variety
          eligible.sort((a, b) => {
            const aTime = recipeHistory.get(a.id)?.getTime() ?? 0;
            const bTime = recipeHistory.get(b.id)?.getTime() ?? 0;
            return aTime - bTime;
          });

          const chosen = eligible[0];
          mealRecipes.push({ recipeId: chosen.id, dishTypeId: dishAlloc.dishTypeId });
          usedRecipeIds.add(chosen.id);

          recipeHistory.set(chosen.id, new Date(current));
          if (chosen.mainIngredientId) {
            mainIngHistory.set(chosen.mainIngredientId, new Date(current));
            sameDayIngredients.add(chosen.mainIngredientId);
          }
        }
      }

      const totalNeeded = slot.dishAllocations.reduce((acc, da) => acc + da.amount, 0);
      const totalFilled = mealRecipes.length;

      if (totalFilled === totalNeeded) {
        summary.generatedMealSlots++;
      } else if (totalFilled > 0) {
        summary.partialMealSlots++;
      } else {
        summary.emptyMealSlots++;
      }

      dayMeals.push({ mealTypeId: slot.mealTypeId, recipes: mealRecipes, isLocked: false });
    }

    if (dayMeals.length > 0) {
      resultDays.push({ date: dateStr, meals: dayMeals });
    }

    current.setDate(current.getDate() + 1);
  }

  if (summary.partialMealSlots > 0) {
    warnings.push({
      code: 'partial_assignment',
      message: `${summary.partialMealSlots} meal slot(s) were only partially filled due to insufficient eligible recipes.`,
    });
  }

  if (summary.emptyMealSlots > 0) {
    warnings.push({
      code: 'empty_assignment',
      message: `${summary.emptyMealSlots} meal slot(s) could not be filled at all due to insufficient eligible recipes or gap constraints.`,
    });
  }

  return { days: resultDays, summary, warnings };
};
