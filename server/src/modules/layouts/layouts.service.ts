import { PrismaClient } from '@prisma/client';
import {
  getLayoutById,
  getMealSlotsByLayoutId,
  reorderMealSlots as reorderMealSlotsRepo,
} from './layouts.repository';
import { doSlotIdsMatch } from './layouts.domain';
import { notFoundError, invalidRequestError } from '../../utils/errors';

export const reorderSlots = async (
  prisma: PrismaClient,
  layoutId: string,
  workspaceId: string,
  slotIds: string[],
) => {
  const layout = await getLayoutById(prisma, layoutId);
  if (!layout || layout.schedule.workspace_id !== workspaceId) throw notFoundError('layout');

  const existingSlots = await getMealSlotsByLayoutId(prisma, layoutId);
  const existingIds = existingSlots.map((s) => s.id);

  if (!doSlotIdsMatch(slotIds, existingIds)) throw invalidRequestError('slotIds');

  const updates = slotIds.map((id, index) => ({ id, order: index }));
  await reorderMealSlotsRepo(prisma, updates);

  return { success: true as const };
};
