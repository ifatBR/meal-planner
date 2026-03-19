import { z } from 'zod';

export const ListMealTypesQuerySchema = z.object({});
export type ListMealTypesQuery = z.infer<typeof ListMealTypesQuerySchema>;

export const CreateMealTypeSchema = z.object({
  name: z.string().min(1).max(30),
});
export type CreateMealTypeInput = z.infer<typeof CreateMealTypeSchema>;

export const UpdateMealTypeSchema = z.object({
  name: z.string().min(1).max(30),
});
export type UpdateMealTypeInput = z.infer<typeof UpdateMealTypeSchema>;

export const MealTypeParamsSchema = z.object({
  id: z.string().uuid(),
});
export type MealTypeParams = z.infer<typeof MealTypeParamsSchema>;

export type MealTypeResponse = {
  id: string;
  name: string;
};
