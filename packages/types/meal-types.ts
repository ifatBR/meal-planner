import { z } from 'zod';

export const ListMealTypesQuerySchema = z.object({});
export type ListMealTypesQuery = z.infer<typeof ListMealTypesQuerySchema>;

export const CreateMealTypeSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().min(1),
});
export type CreateMealTypeInput = z.infer<typeof CreateMealTypeSchema>;

export const UpdateMealTypeSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  color: z.string().min(1).optional(),
}).refine((data) => Object.values(data).some((v) => v !== undefined), {
  message: 'At least one field must be provided',
});
export type UpdateMealTypeInput = z.infer<typeof UpdateMealTypeSchema>;

export const MealTypeParamsSchema = z.object({
  id: z.string().uuid(),
});
export type MealTypeParams = z.infer<typeof MealTypeParamsSchema>;

export type MealTypeResponse = {
  id: string;
  name: string;
  color: string;
};
