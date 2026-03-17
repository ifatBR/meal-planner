import { PrismaClient } from '@prisma/client';

const aliasSelect = { select: { id: true, alias: true } };

export const listIngredients = async (
  prisma: PrismaClient,
  workspaceId: string,
  opts: { page: number; pageSize: number; search?: string },
) => {
  const { page, pageSize, search } = opts;
  const where = {
    workspace_id: workspaceId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            {
              ingredient_aliases: {
                some: { alias: { contains: search, mode: 'insensitive' as const } },
              },
            },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: 'asc' },
      include: { ingredient_aliases: aliasSelect },
    }),
    prisma.ingredient.count({ where }),
  ]);
  return { items, total };
};

export const getIngredientById = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  return prisma.ingredient.findFirst({
    where: { id, workspace_id: workspaceId },
    include: { ingredient_aliases: aliasSelect },
  });
};

export const getAllIngredientNamesAndAliases = async (
  prisma: PrismaClient,
  workspaceId: string,
) => {
  const ingredients = await prisma.ingredient.findMany({
    where: { workspace_id: workspaceId },
    select: {
      id: true,
      name: true,
      ingredient_aliases: { select: { alias: true } },
    },
  });
  return ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    aliases: i.ingredient_aliases.map((a) => a.alias),
  }));
};

export const createIngredient = async (
  prisma: PrismaClient,
  data: { name: string },
  workspaceId: string,
) => {
  return prisma.ingredient.create({
    data: { name: data.name, workspace_id: workspaceId },
    include: { ingredient_aliases: aliasSelect },
  });
};

export const updateIngredient = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  data: { name: string },
) => {
  return prisma.ingredient.update({
    where: { id },
    data: { name: data.name },
    include: { ingredient_aliases: aliasSelect },
  });
};

export const deleteIngredient = async (prisma: PrismaClient, id: string) => {
  return prisma.ingredient.delete({ where: { id } });
};

export const getAliasById = async (prisma: PrismaClient, aliasId: string, workspaceId: string) => {
  return prisma.ingredientAlias.findFirst({
    where: { id: aliasId, workspace_id: workspaceId },
  });
};

export const createAlias = async (
  prisma: PrismaClient,
  data: { ingredientId: string; alias: string },
  workspaceId: string,
) => {
  return prisma.ingredientAlias.create({
    data: {
      alias: data.alias,
      ingredient_id: data.ingredientId,
      workspace_id: workspaceId,
    },
  });
};

export const deleteAlias = async (prisma: PrismaClient, aliasId: string) => {
  return prisma.ingredientAlias.delete({ where: { id: aliasId } });
};
