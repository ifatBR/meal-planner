export const normalise = (value: string): string => value.toLowerCase().trim();

export const isNameConflict = (name: string, existingNames: string[]): boolean => {
  const normalized = normalise(name);
  return existingNames.some((n) => normalise(n) === normalized);
};

export const isAliasConflict = (alias: string, existingAliases: string[]): boolean => {
  const normalized = normalise(alias);
  return existingAliases.some((a) => normalise(a) === normalized);
};

export const hasWorkspaceConflict = (
  value: string,
  existingNames: string[],
  existingAliases: string[],
): boolean => isNameConflict(value, existingNames) || isAliasConflict(value, existingAliases);
