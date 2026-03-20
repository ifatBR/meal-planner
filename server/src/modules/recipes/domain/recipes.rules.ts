export const validateExactlyOneMain = (ingredients: { isMain: boolean }[]): boolean =>
  ingredients.filter((i) => i.isMain).length === 1;
