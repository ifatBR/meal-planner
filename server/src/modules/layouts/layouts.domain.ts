export const doSlotIdsMatch = (incomingIds: string[], existingIds: string[]): boolean => {
  if (incomingIds.length !== existingIds.length) return false;
  const incomingSet = new Set(incomingIds);
  return existingIds.every((id) => incomingSet.has(id));
};
