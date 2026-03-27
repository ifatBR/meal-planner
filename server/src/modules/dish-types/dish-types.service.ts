import { PrismaClient } from '@prisma/client';
import {
  listDishTypes as listDishTypesRepo,
  getDishTypeById,
  createDishType as createDishTypeRepo,
  updateDishType as updateDishTypeRepo,
  deleteDishType as deleteDishTypeRepo,
  countDishTypeReferences,
} from './dish-types.repository';
import { notFoundError, conflictError, isP2002 } from '../../utils/errors';

export const listDishTypes = async (prisma: PrismaClient, workspaceId: string) => {
  return listDishTypesRepo(prisma, workspaceId);
};

export const createDishType = async (
  prisma: PrismaClient,
  data: { name: string },
  workspaceId: string,
) => {
  try {
    const normalizedData = { name: data.name.trim().toLowerCase() };
    return await createDishTypeRepo(prisma, normalizedData, workspaceId);
  } catch (err) {
    if (isP2002(err)) throw conflictError('dish type');
    throw err;
  }
};

export const updateDishType = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  data: { name: string },
) => {
  const dishType = await getDishTypeById(prisma, id, workspaceId);
  if (!dishType) throw notFoundError('dish type');

  try {
    const normalizedData = { name: data.name.trim().toLowerCase() };
    return await updateDishTypeRepo(prisma, id, normalizedData);
  } catch (err) {
    if (isP2002(err)) throw conflictError('dish type');
    throw err;
  }
};

export const deleteDishType = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  const dishType = await getDishTypeById(prisma, id, workspaceId);
  if (!dishType) throw notFoundError('dish type');

  const { recipeCount, constraintCount } = await countDishTypeReferences(prisma, id);
  if (recipeCount > 0 || constraintCount > 0) throw conflictError('dish type');

  await deleteDishTypeRepo(prisma, id);
  return { success: true as const };
};
