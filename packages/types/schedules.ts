import { z } from "zod";

export const ScheduleParamsSchema = z.object({
  id: z.string().uuid(),
});
export type ScheduleParams = z.infer<typeof ScheduleParamsSchema>;

export const ListSchedulesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().optional(),
});
export type ListSchedulesQuery = z.infer<typeof ListSchedulesQuerySchema>;

export const CreateScheduleBodySchema = z.object({
  name: z.string().min(1).max(50),
  layoutId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});
export type CreateScheduleBody = z.infer<typeof CreateScheduleBodySchema>;

export const UpdateScheduleBodySchema = z.object({
  name: z.string().min(1).max(50),
});
export type UpdateScheduleBody = z.infer<typeof UpdateScheduleBodySchema>;

export const CalendarQuerySchema = z.object({
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});
export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;

const BlockedMealInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  mealTypeIds: z.array(z.string().uuid()).min(1),
});

const GenerationSettingsInputSchema = z.object({
  recipeGap: z.number().int().min(1).max(90),
  mainIngGap: z.number().int().min(0).max(90),
  isAllowSameDayIng: z.boolean(),
  blockedMeals: z.array(BlockedMealInputSchema).optional(),
});

export const GenerateScheduleBodySchema = z.object({
  layoutId: z.string().uuid(),
  settings: GenerationSettingsInputSchema,
});
export type GenerateScheduleBody = z.infer<typeof GenerateScheduleBodySchema>;

// Response types (plain TS, not Zod)
export type ScheduleItem = {
  id: string;
  name: string;
  layoutId: string;
  startDate: string;
  endDate: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduleSettings = {
  recipeGap: number;
  mainIngGap: number;
  isAllowSameDayIng: boolean;
  blockedMeals: Array<{ date: string; mealTypeIds: string[] }>;
};

export type CalendarRecipe = {
  recipeId: string;
  recipeName: string;
  dishType: { id: string; name: string };
};

export type CalendarMeal = {
  id: string;
  mealType: { id: string; name: string };
  isLocked: boolean;
  isManuallyEdited: boolean;
  recipes: CalendarRecipe[];
};

export type CalendarDay = {
  id: string | null;
  date: string;
  meals: CalendarMeal[];
};

export type GenerationSummary = {
  requestedDays: number;
  processedMealSlots: number;
  generatedMealSlots: number;
  skippedLockedMealSlots: number;
  skippedBlockedMealSlots: number;
  partialMealSlots: number;
  emptyMealSlots: number;
};

export type GenerationWarning = {
  code: string;
  message: string;
};
