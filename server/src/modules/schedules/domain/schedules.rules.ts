export const validateScheduleDateRange = (
  startDate: Date,
  endDate: Date,
): { valid: boolean; reason?: string } => {
  if (endDate <= startDate) {
    return { valid: false, reason: 'endDate must be after startDate' };
  }
  const daysDiff = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysDiff > 90) {
    return { valid: false, reason: 'Schedule range cannot exceed 90 days' };
  }
  return { valid: true };
};
