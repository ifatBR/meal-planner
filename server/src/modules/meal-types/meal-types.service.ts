import { PrismaClient } from '@prisma/client';
import {
  listMealTypes as listMealTypesRepo,
  getMealTypeById,
  createMealType as createMealTypeRepo,
  updateMealType as updateMealTypeRepo,
  deleteMealType as deleteMealTypeRepo,
  countMealTypeReferences,
} from './meal-types.repository';
import { notFoundError, conflictError, isP2002 } from '../../utils/errors';

export const listMealTypes = async (prisma: PrismaClient, workspaceId: string) => {
  return listMealTypesRepo(prisma, workspaceId);
};

export const createMealType = async (
  prisma: PrismaClient,
  data: { name: string },
  workspaceId: string,
) => {
  try {
    const normalizedData = { name: data.name.trim().toLowerCase() };
    return await createMealTypeRepo(prisma, normalizedData, workspaceId);
  } catch (err) {
    if (isP2002(err)) throw conflictError('meal type');
    throw err;
  }
};

export const updateMealType = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  data: { name: string },
) => {
  const mealType = await getMealTypeById(prisma, id, workspaceId);
  if (!mealType) throw notFoundError('meal type');

  try {
    const normalizedData = { name: data.name.trim().toLowerCase() };
    return await updateMealTypeRepo(prisma, id, normalizedData);
  } catch (err) {
    if (isP2002(err)) throw conflictError('meal type');
    throw err;
  }
};

export const deleteMealType = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  const mealType = await getMealTypeById(prisma, id, workspaceId);
  if (!mealType) throw notFoundError('meal type');

  const { recipeMealTypeCount, scheduleMealCount, mealSlotCount } = await countMealTypeReferences(
    prisma,
    id,
  );
  if (recipeMealTypeCount > 0 || scheduleMealCount > 0 || mealSlotCount > 0)
    throw conflictError('meal type');

  await deleteMealTypeRepo(prisma, id);
  return { success: true as const };
};
