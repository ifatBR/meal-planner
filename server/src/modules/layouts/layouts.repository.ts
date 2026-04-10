import { PrismaClient } from '@prisma/client';

const layoutListSelect = {
  id: true,
  name: true,
  created_at: true,
  updated_at: true,
  _count: { select: { schedules: true } },
} as const;

const layoutDetailSelect = {
  id: true,
  name: true,
  schedules: { select: { id: true, name: true } },
  week_days_layouts: {
    select: {
      id: true,
      days: true,
      meal_slots: {
        select: {
          id: true,
          order: true,
          meal_type: { select: { id: true, name: true } },
          dish_allocations: {
            select: {
              id: true,
              amount: true,
              dish_type: { select: { id: true, name: true } },
            },
            orderBy: { order: 'asc' as const },
          },
        },
        orderBy: { order: 'asc' as const },
      },
    },
  },
} as const;

const layoutSummarySelect = {
  id: true,
  name: true,
  created_at: true,
  updated_at: true,
} as const;

const layoutUpdateReturnSelect = {
  id: true,
  name: true,
  updated_at: true,
  schedules: { select: { id: true, name: true } },
} as const;

type WeekDaysLayoutInput = {
  days: number[];
  mealSlots: Array<{
    mealTypeId: string;
    dishAllocations: Array<{ dishTypeId: string; amount: number }>;
  }>;
};

export type CreateLayoutData = {
  name: string;
  weekDaysLayouts: WeekDaysLayoutInput[];
};

export type UpdateLayoutData = {
  name?: string;
  weekDaysLayouts?: WeekDaysLayoutInput[];
};

const buildWeekDaysLayoutsCreate = (weekDaysLayouts: WeekDaysLayoutInput[]) =>
  weekDaysLayouts.map((wdl) => ({
    days: wdl.days,
    meal_slots: {
      create: wdl.mealSlots.map((slot, order) => ({
        meal_type_id: slot.mealTypeId,
        order,
        dish_allocations: {
          create: slot.dishAllocations.map((da, daOrder) => ({
            dish_type_id: da.dishTypeId,
            amount: da.amount,
            order: daOrder,
          })),
        },
      })),
    },
  }));

export const getLayouts = async (prisma: PrismaClient, workspaceId: string) => {
  return prisma.layout.findMany({
    where: { workspace_id: workspaceId },
    select: layoutListSelect,
    orderBy: { name: 'asc' },
  });
};

export const getLayoutById = async (prisma: PrismaClient, id: string, workspaceId: string) => {
  return prisma.layout.findFirst({
    where: { id, workspace_id: workspaceId },
    select: layoutDetailSelect,
  });
};

export const createLayout = async (
  prisma: PrismaClient,
  data: CreateLayoutData,
  workspaceId: string,
) => {
  return prisma.layout.create({
    data: {
      name: data.name,
      workspace_id: workspaceId,
      week_days_layouts: {
        create: buildWeekDaysLayoutsCreate(data.weekDaysLayouts),
      },
    },
    select: layoutSummarySelect,
  });
};

export const updateLayout = async (prisma: PrismaClient, id: string, data: UpdateLayoutData) => {
  return prisma.$transaction(async (tx) => {
    if (data.weekDaysLayouts !== undefined) {
      await tx.weekDaysLayout.deleteMany({ where: { layout_id: id } });
    }
    return tx.layout.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.weekDaysLayouts !== undefined && {
          week_days_layouts: {
            create: buildWeekDaysLayoutsCreate(data.weekDaysLayouts),
          },
        }),
      },
      select: layoutUpdateReturnSelect,
    });
  });
};

export const deleteLayout = async (prisma: PrismaClient, id: string) => {
  return prisma.layout.delete({ where: { id } });
};

export const cloneLayout = async (
  prisma: PrismaClient,
  sourceId: string,
  name: string,
  workspaceId: string,
) => {
  return prisma.$transaction(async (tx) => {
    const source = await tx.layout.findFirst({
      where: { id: sourceId },
      select: {
        week_days_layouts: {
          select: {
            days: true,
            meal_slots: {
              select: {
                meal_type_id: true,
                order: true,
                dish_allocations: {
                  select: { dish_type_id: true, amount: true, order: true },
                  orderBy: { order: 'asc' as const },
                },
              },
              orderBy: { order: 'asc' as const },
            },
          },
        },
      },
    });

    if (!source) return null;

    return tx.layout.create({
      data: {
        name,
        workspace_id: workspaceId,
        week_days_layouts: {
          create: source.week_days_layouts.map((wdl) => ({
            days: wdl.days,
            meal_slots: {
              create: wdl.meal_slots.map((slot) => ({
                meal_type_id: slot.meal_type_id,
                order: slot.order,
                dish_allocations: {
                  create: slot.dish_allocations.map((da) => ({
                    dish_type_id: da.dish_type_id,
                    amount: da.amount,
                    order: da.order,
                  })),
                },
              })),
            },
          })),
        },
      },
      select: layoutSummarySelect,
    });
  });
};
