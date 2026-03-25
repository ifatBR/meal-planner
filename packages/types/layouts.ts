import { z } from 'zod';

export const LayoutParamsSchema = z.object({
  id: z.string().uuid(),
});
export type LayoutParams = z.infer<typeof LayoutParamsSchema>;

export const LayoutQuerySchema = z.object({
  scheduleId: z.string().uuid().optional(),
});
export type LayoutQuery = z.infer<typeof LayoutQuerySchema>;

const DishAllocationInputSchema = z.object({
  dishTypeId: z.string().uuid(),
  amount: z.number().int().min(1),
});

const MealSlotInputSchema = z.object({
  mealTypeId: z.string().uuid(),
  dishAllocations: z.array(DishAllocationInputSchema).min(1),
});

const WeekDaysLayoutInputSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).min(1),
  mealSlots: z.array(MealSlotInputSchema).min(1),
});

export const CreateLayoutBodySchema = z.object({
  name: z.string().min(1).max(50),
  weekDaysLayouts: z.array(WeekDaysLayoutInputSchema).min(1),
});
export type CreateLayoutBody = z.infer<typeof CreateLayoutBodySchema>;

export const UpdateLayoutBodySchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    weekDaysLayouts: z.array(WeekDaysLayoutInputSchema).min(1).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });
export type UpdateLayoutBody = z.infer<typeof UpdateLayoutBodySchema>;

export const CloneLayoutBodySchema = z.object({
  name: z.string().min(1).max(50),
});
export type CloneLayoutBody = z.infer<typeof CloneLayoutBodySchema>;
