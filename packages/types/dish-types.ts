import { z } from 'zod';

export const ListDishTypesQuerySchema = z.object({});
export type ListDishTypesQuery = z.infer<typeof ListDishTypesQuerySchema>;

export const CreateDishTypeSchema = z.object({
  name: z.string().min(1).max(30),
});
export type CreateDishTypeInput = z.infer<typeof CreateDishTypeSchema>;

export const UpdateDishTypeSchema = z.object({
  name: z.string().min(1).max(30),
});
export type UpdateDishTypeInput = z.infer<typeof UpdateDishTypeSchema>;

export const DishTypeParamsSchema = z.object({
  id: z.string().uuid(),
});
export type DishTypeParams = z.infer<typeof DishTypeParamsSchema>;

export type DishTypeResponse = {
  id: string;
  name: string;
};
