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
    return await createDishTypeRepo(prisma, data, workspaceId);
  } catch (err) {
    if (isP2002(err)) throw conflictError();
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
  if (!dishType) throw notFoundError();

  try {
    return await updateDishTypeRepo(prisma, id, data);
  } catch (err) {
    if (isP2002(err)) throw conflictError();
    throw err;
  }
};

export const deleteDishType = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  const dishType = await getDishTypeById(prisma, id, workspaceId);
  if (!dishType) throw notFoundError();

  const { recipeCount, constraintCount } = await countDishTypeReferences(prisma, id);
  if (recipeCount > 0 || constraintCount > 0) throw conflictError();

  await deleteDishTypeRepo(prisma, id);
  return { success: true as const };
};
