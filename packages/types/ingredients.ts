import { z } from 'zod'

export const ListIngredientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})
export type ListIngredientsQuery = z.infer<typeof ListIngredientsQuerySchema>

export const CreateIngredientSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().optional(),
})
export type CreateIngredientInput = z.infer<typeof CreateIngredientSchema>

export const UpdateIngredientSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().optional(),
})
export type UpdateIngredientInput = z.infer<typeof UpdateIngredientSchema>

export type IngredientResponse = {
  id: string
  name: string
  category: string | null
  workspace_id: string
  created_at: Date
  updated_at: Date
  ingredient_aliases: { id: string; alias: string }[]
}

export const IngredientParamsSchema = z.object({
  id: z.string().uuid(),
})
export type IngredientParams = z.infer<typeof IngredientParamsSchema>

export const MatchIngredientSchema = z.object({
  name: z.string().min(1).max(100),
})
export type MatchIngredientInput = z.infer<typeof MatchIngredientSchema>

export const AddAliasSchema = z.object({
  alias: z.string().min(1).max(100),
})
export type AddAliasInput = z.infer<typeof AddAliasSchema>

export const UpdateAliasSchema = z.object({
  alias: z.string().min(1).max(100),
})
export type UpdateAliasInput = z.infer<typeof UpdateAliasSchema>

export const AliasParamsSchema = z.object({
  id: z.string().uuid(),
  aliasId: z.string().uuid(),
})
export type AliasParams = z.infer<typeof AliasParamsSchema>
