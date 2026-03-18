import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  listIngredients as listIngredientsRepo,
  getIngredientById,
  getAllIngredientNamesAndVariants,
  createIngredient as createIngredientRepo,
  updateIngredient as updateIngredientRepo,
  deleteIngredient as deleteIngredientRepo,
  getVariantById,
  createVariant,
  deleteVariant as deleteVariantRepo,
} from './ingredients.repository';
import { hasWorkspaceConflict, normalise } from './domain/ingredients.rules';
import { findMatchingIngredient } from './domain/ingredients.algorithms';
import { notFoundError, conflictError } from '../../utils/errors';

const isP2002 = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  'code' in err &&
  (err as { code: string }).code === 'P2002';

export const listIngredients = async (
  prisma: PrismaClient,
  workspaceId: string,
  opts: { page: number; pageSize: number; search?: string },
) => {
  const { items, total } = await listIngredientsRepo(prisma, workspaceId, opts);
  return {
    items,
    meta: {
      page: opts.page,
      pageSize: opts.pageSize,
      total,
      totalPages: Math.ceil(total / opts.pageSize),
    },
  };
};

export const fetchIngredientById = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
) => {
  const ingredient = await getIngredientById(prisma, id, workspaceId);
  if (!ingredient) throw notFoundError();
  return ingredient;
};

//searches if input ingredient name exsists as main ingredient or as variant
//if not- uses ai to find a matching existing ingredient, and creates a variant for it.
//Else returns match:false
export const matchIngredient = async (prisma: PrismaClient, name: string, workspaceId: string) => {
  const candidates = await getAllIngredientNamesAndVariants(prisma, workspaceId);
  const result = await findMatchingIngredient(name, candidates);

  if (!result) return { matched: false as const, ingredient: null };

  const ingredient = await getIngredientById(prisma, result.ingredientId, workspaceId);
  if (!ingredient) return { matched: false as const, ingredient: null };

  const normalizedInput = normalise(name);
  const normalizedIngName = normalise(ingredient.name);
  const existingVariants = ingredient.ingredient_variants.map((a) => normalise(a.variant));

  if (normalizedInput !== normalizedIngName && !existingVariants.includes(normalizedInput)) {
    try {
      const newVariant = await createVariant(
        prisma,
        { ingredientId: ingredient.id, variant: name },
        workspaceId,
      );
      ingredient.ingredient_variants.push({ id: newVariant.id, variant: newVariant.variant });
    } catch (err) {
      if (isP2002(err)) throw conflictError();
      throw err;
    }
  }

  return { matched: true as const, ingredient };
};

export const createIngredient = async (
  prisma: PrismaClient,
  data: { name: string },
  workspaceId: string,
) => {
  const existing = await getAllIngredientNamesAndVariants(prisma, workspaceId);
  const names = existing.map((e) => e.name);
  const variants = existing.flatMap((e) => e.variants);

  if (hasWorkspaceConflict(data.name, names, variants)) throw conflictError();

  try {
    return await createIngredientRepo(prisma, data, workspaceId);
  } catch (err) {
    if (isP2002(err)) throw conflictError();
    throw err;
  }
};

export const updateIngredient = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  data: { name: string },
) => {
  const ingredient = await getIngredientById(prisma, id, workspaceId);
  if (!ingredient) throw notFoundError();

  const existing = await getAllIngredientNamesAndVariants(prisma, workspaceId);
  const names = existing.filter((e) => e.id !== id).map((e) => e.name);
  const variants = existing.filter((e) => e.id !== id).flatMap((e) => e.variants);

  if (hasWorkspaceConflict(data.name, names, variants)) throw conflictError();

  try {
    return await updateIngredientRepo(prisma, id, workspaceId, data);
  } catch (err) {
    if (isP2002(err)) throw conflictError();
    throw err;
  }
};

export const deleteIngredient = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  const ingredient = await getIngredientById(prisma, id, workspaceId);
  if (!ingredient) throw notFoundError();
  await deleteIngredientRepo(prisma, id);
  return { id };
};

export const addVariant = async (
  prisma: PrismaClient,
  ingredientId: string,
  workspaceId: string,
  variant: string,
) => {
  const ingredient = await getIngredientById(prisma, ingredientId, workspaceId);
  if (!ingredient) throw notFoundError();

  const existing = await getAllIngredientNamesAndVariants(prisma, workspaceId);
  const names = existing.map((e) => e.name);
  const variants = existing.flatMap((e) => e.variants);

  if (hasWorkspaceConflict(variant, names, variants)) throw conflictError();

  try {
    return await createVariant(prisma, { ingredientId, variant }, workspaceId);
  } catch (err) {
    if (isP2002(err)) throw conflictError();
    throw err;
  }
};

export const removeVariant = async (
  prisma: PrismaClient,
  ingredientId: string,
  variantId: string,
  workspaceId: string,
) => {
  const variant = await getVariantById(prisma, variantId, workspaceId);
  if (!variant || variant.ingredient_id !== ingredientId) throw notFoundError();
  await deleteVariantRepo(prisma, variantId);
  return { id: variantId };
};

export const seedWorkspaceIngredients = async (prisma: PrismaClient, workspaceId: string) => {
  const filePath = path.resolve(__dirname, '../../../prisma/global-ingredients.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const globalIngredients: Array<{ name: string; category?: string; variants: string[] }> =
    JSON.parse(raw);

  for (const item of globalIngredients) {
    try {
      const ingredient = await createIngredientRepo(
        prisma,
        { name: item.name, category: item.category },
        workspaceId,
      );
      if (item.variants.length > 0) {
        await prisma.ingredientVariant.createMany({
          data: item.variants.map((variant) => ({
            variant,
            ingredient_id: ingredient.id,
            workspace_id: workspaceId,
          })),
          skipDuplicates: true,
        });
      }
    } catch (err) {
      if (isP2002(err)) continue;
      throw err;
    }
  }
};
