export const normalise = (value: string): string => value.toLowerCase().trim();

export const isNameConflict = (name: string, existingNames: string[]): boolean => {
  const normalized = normalise(name);
  return existingNames.some((n) => normalise(n) === normalized);
};

export const isVariantConflict = (variant: string, existingVariants: string[]): boolean => {
  const normalized = normalise(variant);
  return existingVariants.some((a) => normalise(a) === normalized);
};

export const hasWorkspaceConflict = (
  value: string,
  existingNames: string[],
  existingVariants: string[],
): boolean => isNameConflict(value, existingNames) || isVariantConflict(value, existingVariants);
