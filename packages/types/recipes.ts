import { z } from 'zod';

const RecipeIngredientInputSchema = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  isMain: z.boolean(),
  measure: z
    .object({
      amount: z.number().positive(),
      unit: z.string().min(1),
    })
    .optional(),
});

export const ListRecipesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().optional(),
  dishTypeId: z.string().uuid().optional(),
  mealTypeId: z.string().uuid().optional(),
  ingredientId: z.string().uuid().optional(),
});
export type ListRecipesQuery = z.infer<typeof ListRecipesQuerySchema>;

export const GetRecipeParamsSchema = z.object({
  id: z.string().uuid(),
});
export type GetRecipeParams = z.infer<typeof GetRecipeParamsSchema>;

export const CreateRecipeBodySchema = z.object({
  name: z.string().min(1).max(80),
  instructions: z.string().optional(),
  dishTypeIds: z.array(z.string().uuid()).min(1),
  mealTypeIds: z.array(z.string().uuid()).min(1),
  ingredients: z.array(RecipeIngredientInputSchema).min(1),
});
export type CreateRecipeBody = z.infer<typeof CreateRecipeBodySchema>;

export const UpdateRecipeParamsSchema = z.object({
  id: z.string().uuid(),
});
export type UpdateRecipeParams = z.infer<typeof UpdateRecipeParamsSchema>;

export const UpdateRecipeBodySchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    instructions: z.string().nullable().optional(),
    dishTypeIds: z.array(z.string().uuid()).min(1).optional(),
    mealTypeIds: z.array(z.string().uuid()).min(1).optional(),
    ingredients: z.array(RecipeIngredientInputSchema).min(1).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });
export type UpdateRecipeBody = z.infer<typeof UpdateRecipeBodySchema>;

export const DeleteRecipeParamsSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteRecipeParams = z.infer<typeof DeleteRecipeParamsSchema>;

export const CloneRecipeParamsSchema = z.object({
  id: z.string().uuid(),
});
export type CloneRecipeParams = z.infer<typeof CloneRecipeParamsSchema>;

export const CloneRecipeBodySchema = z.object({
  name: z.string().min(1).max(80),
});
export type CloneRecipeBody = z.infer<typeof CloneRecipeBodySchema>;
