export const isReferencedByOthers = (
  recipeMealTypeCount: number,
  scheduleMealCount: number,
  mealSlotCount: number,
): boolean => recipeMealTypeCount > 0 || scheduleMealCount > 0 || mealSlotCount > 0;
