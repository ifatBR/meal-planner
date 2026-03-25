import { PrismaClient } from '@prisma/client';
import type { CreateLayoutBody, UpdateLayoutBody } from '@app/types/layouts';
import {
  getLayouts,
  getLayoutById,
  createLayout as createLayoutRepo,
  updateLayout as updateLayoutRepo,
  deleteLayout as deleteLayoutRepo,
  cloneLayout as cloneLayoutRepo,
} from './layouts.repository';
import { getMealTypesByIds } from '../meal-types/meal-types.repository';
import { getDishTypesByIds } from '../dish-types/dish-types.repository';
import { hasDayOverlap } from './domain/layouts.rules';
import {
  notFoundError,
  invalidRequestError,
  ruleViolationError,
  conflictError,
  isP2002,
  LayoutConflictError,
} from '../../utils/errors';

type WeekDaysLayoutInput = CreateLayoutBody['weekDaysLayouts'][number];

const validateWeekDaysLayoutIds = async (
  prisma: PrismaClient,
  weekDaysLayouts: WeekDaysLayoutInput[],
  workspaceId: string,
) => {
  const mealTypeIds = [
    ...new Set(weekDaysLayouts.flatMap((wdl) => wdl.mealSlots.map((s) => s.mealTypeId))),
  ];
  const dishTypeIds = [
    ...new Set(
      weekDaysLayouts.flatMap((wdl) =>
        wdl.mealSlots.flatMap((s) => s.dishAllocations.map((da) => da.dishTypeId)),
      ),
    ),
  ];

  const [foundMealTypes, foundDishTypes] = await Promise.all([
    getMealTypesByIds(prisma, mealTypeIds, workspaceId),
    getDishTypesByIds(prisma, dishTypeIds, workspaceId),
  ]);

  if (foundMealTypes.length !== mealTypeIds.length) throw invalidRequestError('mealTypeId');
  if (foundDishTypes.length !== dishTypeIds.length) throw invalidRequestError('dishTypeId');
};

const checkScheduleConflict = (
  usedBySchedules: Array<{ id: string; name: string }>,
  scheduleId: string | undefined,
  errorCode: string,
  message: string,
): void => {
  if (usedBySchedules.length === 0) return;
  if (usedBySchedules.length === 1 && scheduleId === usedBySchedules[0].id) return;
  throw new LayoutConflictError(errorCode, message, usedBySchedules);
};

export const listLayouts = async (prisma: PrismaClient, workspaceId: string) => {
  return getLayouts(prisma, workspaceId);
};

export const fetchLayoutById = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  const layout = await getLayoutById(prisma, id, workspaceId);
  if (!layout) throw notFoundError('layout');
  return layout;
};

export const createLayout = async (
  prisma: PrismaClient,
  workspaceId: string,
  data: CreateLayoutBody,
) => {
  if (hasDayOverlap(data.weekDaysLayouts)) {
    throw ruleViolationError('Each day can only appear in one week layout');
  }

  await validateWeekDaysLayoutIds(prisma, data.weekDaysLayouts, workspaceId);

  try {
    return await createLayoutRepo(prisma, data, workspaceId);
  } catch (err) {
    if (isP2002(err)) throw conflictError('layout');
    throw err;
  }
};

export const updateLayout = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  data: UpdateLayoutBody,
  scheduleId?: string,
) => {
  const layout = await getLayoutById(prisma, id, workspaceId);
  if (!layout) throw notFoundError('layout');

  if (data.weekDaysLayouts !== undefined) {
    checkScheduleConflict(
      layout.schedules,
      scheduleId,
      'layout_structural_edit_blocked',
      'This layout is used by schedules and its structure cannot be changed.',
    );

    if (hasDayOverlap(data.weekDaysLayouts)) {
      throw ruleViolationError('Each day can only appear in one week layout');
    }

    await validateWeekDaysLayoutIds(prisma, data.weekDaysLayouts, workspaceId);
  }

  try {
    return await updateLayoutRepo(prisma, id, {
      name: data.name,
      weekDaysLayouts: data.weekDaysLayouts,
    });
  } catch (err) {
    if (isP2002(err)) throw conflictError('layout');
    throw err;
  }
};

export const cloneLayout = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  name: string,
) => {
  const layout = await getLayoutById(prisma, id, workspaceId);
  if (!layout) throw notFoundError('layout');

  try {
    const cloned = await cloneLayoutRepo(prisma, id, name, workspaceId);
    if (!cloned) throw notFoundError('layout');
    return cloned;
  } catch (err) {
    if (isP2002(err)) throw conflictError('layout');
    throw err;
  }
};

export const deleteLayout = async (
  prisma: PrismaClient,
  id: string,
  workspaceId: string,
  scheduleId?: string,
) => {
  const layout = await getLayoutById(prisma, id, workspaceId);
  if (!layout) throw notFoundError('layout');

  checkScheduleConflict(
    layout.schedules,
    scheduleId,
    'layout_in_use',
    'This layout is used by schedules and cannot be deleted.',
  );

  await deleteLayoutRepo(prisma, id);
  return { success: true as const };
};
