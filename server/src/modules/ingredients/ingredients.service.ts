import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  listIngredients as listIngredientsRepo,
  getIngredientById,
  getAllIngredientNamesAndAliases,
  createIngredient as createIngredientRepo,
  updateIngredient as updateIngredientRepo,
  deleteIngredient as deleteIngredientRepo,
  getAliasById,
  createAlias,
  deleteAlias as deleteAliasRepo,
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

export const matchIngredient = async (prisma: PrismaClient, name: string, workspaceId: string) => {
  const candidates = await getAllIngredientNamesAndAliases(prisma, workspaceId);
  const result = await findMatchingIngredient(name, candidates);

  if (!result) return { matched: false as const, ingredient: null };

  const ingredient = await getIngredientById(prisma, result.ingredientId, workspaceId);
  if (!ingredient) return { matched: false as const, ingredient: null };

  const normalizedInput = normalise(name);
  const normalizedIngName = normalise(ingredient.name);
  const existingAliases = ingredient.ingredient_aliases.map((a) => normalise(a.alias));

  if (normalizedInput !== normalizedIngName && !existingAliases.includes(normalizedInput)) {
    try {
      await createAlias(prisma, { ingredientId: ingredient.id, alias: name }, workspaceId);
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
  const existing = await getAllIngredientNamesAndAliases(prisma, workspaceId);
  const names = existing.map((e) => e.name);
  const aliases = existing.flatMap((e) => e.aliases);

  if (hasWorkspaceConflict(data.name, names, aliases)) throw conflictError();

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

  const existing = await getAllIngredientNamesAndAliases(prisma, workspaceId);
  const names = existing.filter((e) => e.id !== id).map((e) => e.name);
  const aliases = existing.filter((e) => e.id !== id).flatMap((e) => e.aliases);

  if (hasWorkspaceConflict(data.name, names, aliases)) throw conflictError();

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

export const addAlias = async (
  prisma: PrismaClient,
  ingredientId: string,
  workspaceId: string,
  alias: string,
) => {
  const ingredient = await getIngredientById(prisma, ingredientId, workspaceId);
  if (!ingredient) throw notFoundError();

  const existing = await getAllIngredientNamesAndAliases(prisma, workspaceId);
  const names = existing.map((e) => e.name);
  const aliases = existing.flatMap((e) => e.aliases);

  if (hasWorkspaceConflict(alias, names, aliases)) throw conflictError();

  try {
    return await createAlias(prisma, { ingredientId, alias }, workspaceId);
  } catch (err) {
    if (isP2002(err)) throw conflictError();
    throw err;
  }
};

export const removeAlias = async (
  prisma: PrismaClient,
  ingredientId: string,
  aliasId: string,
  workspaceId: string,
) => {
  const alias = await getAliasById(prisma, aliasId, workspaceId);
  if (!alias || alias.ingredient_id !== ingredientId) throw notFoundError();
  await deleteAliasRepo(prisma, aliasId);
  return { id: aliasId };
};

export const seedWorkspaceIngredients = async (prisma: PrismaClient, workspaceId: string) => {
  const filePath = path.resolve(__dirname, '../../../prisma/global-ingredients.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const globalIngredients: Array<{ name: string; aliases: string[] }> = JSON.parse(raw);

  for (const item of globalIngredients) {
    try {
      const ingredient = await prisma.ingredient.create({
        data: { name: item.name, workspace_id: workspaceId },
      });
      if (item.aliases.length > 0) {
        await prisma.ingredientAlias.createMany({
          data: item.aliases.map((alias) => ({
            alias,
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
