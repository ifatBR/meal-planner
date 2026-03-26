export const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const formatDate = (date: Date): string => date.toISOString().split('T')[0];
