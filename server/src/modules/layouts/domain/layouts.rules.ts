export const hasDayOverlap = (weekDaysLayouts: Array<{ days: number[] }>): boolean => {
  const seen = new Set<number>();
  for (const wdl of weekDaysLayouts) {
    for (const day of wdl.days) {
      if (seen.has(day)) return true;
      seen.add(day);
    }
  }
  return false;
};
