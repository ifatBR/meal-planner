import { PrismaClient } from '@prisma/client';

const variantSelect = { select: { id: true, variant: true } };

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
              ingredient_variants: {
                some: { variant: { contains: search, mode: 'insensitive' as const } },
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
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        category: true,
        workspace_id: true,
        created_at: true,
        updated_at: true,
        ingredient_variants: variantSelect,
      },
    }),
    prisma.ingredient.count({ where }),
  ]);
  return { items, total };
};

export const getIngredientById = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  return prisma.ingredient.findFirst({
    where: { id, workspace_id: workspaceId },
    include: { ingredient_variants: variantSelect },
  });
};

export const getAllIngredientNamesAndVariants = async (
  prisma: PrismaClient,
  workspaceId: string,
) => {
  const ingredients = await prisma.ingredient.findMany({
    where: { workspace_id: workspaceId },
    select: {
      id: true,
      name: true,
      ingredient_variants: { select: { variant: true } },
    },
  });
  return ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    variants: i.ingredient_variants.map((a) => a.variant),
  }));
};

export const createIngredient = async (
  prisma: PrismaClient,
  data: { name: string; category?: string },
  workspaceId: string,
) => {
  return prisma.ingredient.create({
    data: { name: data.name, category: data.category ?? null, workspace_id: workspaceId },
    include: { ingredient_variants: variantSelect },
  });
};

export const updateIngredient = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  data: { name: string; category?: string },
) => {
  return prisma.ingredient.update({
    where: { id },
    data: { name: data.name, category: data.category },
    include: { ingredient_variants: variantSelect },
  });
};

export const deleteIngredient = async (prisma: PrismaClient, id: string) => {
  return prisma.ingredient.delete({ where: { id } });
};

export const getVariantById = async (
  prisma: PrismaClient,
  variantId: string,
  workspaceId: string,
) => {
  return prisma.ingredientVariant.findFirst({
    where: { id: variantId, workspace_id: workspaceId },
  });
};

export const createVariant = async (
  prisma: PrismaClient,
  data: { ingredientId: string; variant: string },
  workspaceId: string,
) => {
  return prisma.ingredientVariant.create({
    data: {
      variant: data.variant,
      ingredient_id: data.ingredientId,
      workspace_id: workspaceId,
    },
  });
};

export const deleteVariant = async (prisma: PrismaClient, variantId: string) => {
  return prisma.ingredientVariant.delete({ where: { id: variantId } });
};
