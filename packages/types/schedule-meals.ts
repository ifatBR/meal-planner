import { z } from 'zod';

export const ScheduleMealParamsSchema = z.object({
  id: z.string().uuid(),
});
export type ScheduleMealParams = z.infer<typeof ScheduleMealParamsSchema>;

export const UpdateScheduleMealBodySchema = z
  .object({
    recipeIds: z.array(z.string().uuid()).optional(),
    isLocked: z.boolean().optional(),
  })
  .refine((data) => data.recipeIds !== undefined || data.isLocked !== undefined, {
    message: 'At least one field must be provided',
  });
export type UpdateScheduleMealBody = z.infer<typeof UpdateScheduleMealBodySchema>;

// Response types (plain TS, not Zod)
export type ScheduleMealRecipe = {
  recipeId: string;
  recipeName: string;
  dishType: { id: string; name: string };
};

export type ScheduleMealResponse = {
  id: string;
  mealType: { id: string; name: string };
  isLocked: boolean;
  isManuallyEdited: boolean;
  recipes: ScheduleMealRecipe[];
};
