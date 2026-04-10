import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  getLayouts,
  getLayoutById,
  createLayout,
  updateLayout,
  deleteLayout,
  cloneLayout,
} from '../layouts.repository';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const WS_ID =    '00000000-0000-0000-0004-000000000001';
const MT_ID =    '00000000-0000-0000-0004-000000000002';
const DT_ID =    '00000000-0000-0000-0004-000000000003';
const SCHED_ID = '00000000-0000-0000-0004-000000000004';

const validWeekDaysLayouts = [
  {
    days: [0, 1, 2],
    mealSlots: [
      {
        mealTypeId: MT_ID,
        dishAllocations: [{ dishTypeId: DT_ID, amount: 2 }],
      },
    ],
  },
];

beforeAll(async () => {
  await prisma.workspace.upsert({
    where: { id: WS_ID },
    update: {},
    create: { id: WS_ID, name: 'Layouts Test Workspace' },
  });
  await prisma.mealType.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Meal Type' } },
    update: {},
    create: { id: MT_ID, name: 'Test Meal Type', workspace_id: WS_ID },
  });
  await prisma.dishType.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Dish Type' } },
    update: {},
    create: { id: DT_ID, name: 'Test Dish Type', workspace_id: WS_ID },
  });
});

beforeEach(async () => {
  await prisma.schedule.deleteMany({ where: { workspace_id: WS_ID } });
  await prisma.layout.deleteMany({ where: { workspace_id: WS_ID } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('getLayouts', () => {
  it('returns all layouts for the workspace', async () => {
    await prisma.layout.createMany({
      data: [
        { name: 'Layout A', workspace_id: WS_ID },
        { name: 'Layout B', workspace_id: WS_ID },
      ],
    });
    const result = await getLayouts(prisma, WS_ID);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when workspace has no layouts', async () => {
    const result = await getLayouts(prisma, WS_ID);
    expect(result).toHaveLength(0);
  });

  it('returns inUse count reflecting schedule references', async () => {
    const layout = await prisma.layout.create({
      data: { name: 'Used Layout', workspace_id: WS_ID },
    });
    await prisma.schedule.create({
      data: {
        id: SCHED_ID,
        name: 'Test Schedule',
        workspace_id: WS_ID,
        layout_id: layout.id,
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-01-31'),
      },
    });
    const result = await getLayouts(prisma, WS_ID);
    expect(result[0]._count.schedules).toBe(1);
  });

  it('does not return layouts from other workspaces', async () => {
    await prisma.layout.create({ data: { name: 'Layout A', workspace_id: WS_ID } });
    const result = await getLayouts(prisma, '00000000-0000-0000-0000-999999999999');
    expect(result).toHaveLength(0);
  });
});

describe('getLayoutById', () => {
  it('returns full detail with nested weekDaysLayouts', async () => {
    const created = await createLayout(prisma, { name: 'Detail Layout', weekDaysLayouts: validWeekDaysLayouts }, WS_ID);
    const result = await getLayoutById(prisma, created.id, WS_ID);
    expect(result?.id).toBe(created.id);
    expect(result?.week_days_layouts).toHaveLength(1);
    expect(result?.week_days_layouts[0].meal_slots).toHaveLength(1);
    expect(result?.week_days_layouts[0].meal_slots[0].dish_allocations).toHaveLength(1);
  });

  it('returns null for non-existent layout', async () => {
    const result = await getLayoutById(prisma, '00000000-0000-0000-0000-999999999999', WS_ID);
    expect(result).toBeNull();
  });

  it('returns null when layout belongs to a different workspace', async () => {
    const created = await createLayout(prisma, { name: 'Other WS', weekDaysLayouts: validWeekDaysLayouts }, WS_ID);
    const result = await getLayoutById(prisma, created.id, '00000000-0000-0000-0000-999999999999');
    expect(result).toBeNull();
  });
});

describe('createLayout', () => {
  it('creates layout with nested weekDaysLayouts, mealSlots, and dishAllocations', async () => {
    const result = await createLayout(
      prisma,
      { name: 'New Layout', weekDaysLayouts: validWeekDaysLayouts },
      WS_ID,
    );
    expect(result.name).toBe('New Layout');
    const detail = await getLayoutById(prisma, result.id, WS_ID);
    expect(detail?.week_days_layouts[0].days).toEqual([0, 1, 2]);
    expect(detail?.week_days_layouts[0].meal_slots[0].meal_type.id).toBe(MT_ID);
    expect(detail?.week_days_layouts[0].meal_slots[0].dish_allocations[0].dish_type.id).toBe(DT_ID);
    expect(detail?.week_days_layouts[0].meal_slots[0].dish_allocations[0].amount).toBe(2);
  });

  it('derives mealSlot order from array index', async () => {
    const result = await createLayout(
      prisma,
      {
        name: 'Order Test',
        weekDaysLayouts: [
          {
            days: [0],
            mealSlots: [
              { mealTypeId: MT_ID, dishAllocations: [{ dishTypeId: DT_ID, amount: 1 }] },
            ],
          },
        ],
      },
      WS_ID,
    );
    const detail = await getLayoutById(prisma, result.id, WS_ID);
    expect(detail?.week_days_layouts[0].meal_slots[0].order).toBe(0);
  });

  it('returns dishAllocations in insertion order', async () => {
    const DT_ID_2 = '00000000-0000-0000-0004-000000000005';
    await prisma.dishType.upsert({
      where: { workspace_id_name: { workspace_id: WS_ID, name: 'Second Dish Type' } },
      update: {},
      create: { id: DT_ID_2, name: 'Second Dish Type', workspace_id: WS_ID },
    });
    const result = await createLayout(
      prisma,
      {
        name: 'DA Order Test',
        weekDaysLayouts: [
          {
            days: [0],
            mealSlots: [
              {
                mealTypeId: MT_ID,
                dishAllocations: [
                  { dishTypeId: DT_ID, amount: 1 },
                  { dishTypeId: DT_ID_2, amount: 2 },
                ],
              },
            ],
          },
        ],
      },
      WS_ID,
    );
    const detail = await getLayoutById(prisma, result.id, WS_ID);
    const allocations = detail?.week_days_layouts[0].meal_slots[0].dish_allocations;
    expect(allocations?.[0].dish_type.id).toBe(DT_ID);
    expect(allocations?.[1].dish_type.id).toBe(DT_ID_2);
  });
});

describe('updateLayout', () => {
  it('updates name only', async () => {
    const layout = await createLayout(prisma, { name: 'Original', weekDaysLayouts: validWeekDaysLayouts }, WS_ID);
    const result = await updateLayout(prisma, layout.id, { name: 'Renamed' });
    expect(result.name).toBe('Renamed');
  });

  it('replaces weekDaysLayouts wholesale when provided', async () => {
    const layout = await createLayout(prisma, { name: 'Layout', weekDaysLayouts: validWeekDaysLayouts }, WS_ID);
    const newLayouts = [
      {
        days: [3, 4, 5, 6],
        mealSlots: [{ mealTypeId: MT_ID, dishAllocations: [{ dishTypeId: DT_ID, amount: 1 }] }],
      },
    ];
    await updateLayout(prisma, layout.id, { weekDaysLayouts: newLayouts });
    const detail = await getLayoutById(prisma, layout.id, WS_ID);
    expect(detail?.week_days_layouts).toHaveLength(1);
    expect(detail?.week_days_layouts[0].days).toEqual([3, 4, 5, 6]);
  });
});

describe('deleteLayout', () => {
  it('deletes layout and cascades to weekDaysLayouts', async () => {
    const layout = await createLayout(prisma, { name: 'To Delete', weekDaysLayouts: validWeekDaysLayouts }, WS_ID);
    await deleteLayout(prisma, layout.id);
    const result = await getLayoutById(prisma, layout.id, WS_ID);
    expect(result).toBeNull();
  });
});

describe('cloneLayout', () => {
  it('creates a deep copy with a new name', async () => {
    const source = await createLayout(
      prisma,
      { name: 'Source', weekDaysLayouts: validWeekDaysLayouts },
      WS_ID,
    );
    const cloned = await cloneLayout(prisma, source.id, 'Clone', WS_ID);
    expect(cloned).not.toBeNull();
    expect(cloned!.name).toBe('Clone');
    expect(cloned!.id).not.toBe(source.id);

    const detail = await getLayoutById(prisma, cloned!.id, WS_ID);
    expect(detail?.week_days_layouts).toHaveLength(1);
    expect(detail?.week_days_layouts[0].meal_slots[0].dish_allocations[0].amount).toBe(2);
  });

  it('preserves dishAllocation order when cloning', async () => {
    const DT_ID_2 = '00000000-0000-0000-0004-000000000005';
    await prisma.dishType.upsert({
      where: { workspace_id_name: { workspace_id: WS_ID, name: 'Second Dish Type' } },
      update: {},
      create: { id: DT_ID_2, name: 'Second Dish Type', workspace_id: WS_ID },
    });
    const source = await createLayout(
      prisma,
      {
        name: 'Clone Order Source',
        weekDaysLayouts: [
          {
            days: [0],
            mealSlots: [
              {
                mealTypeId: MT_ID,
                dishAllocations: [
                  { dishTypeId: DT_ID, amount: 1 },
                  { dishTypeId: DT_ID_2, amount: 2 },
                ],
              },
            ],
          },
        ],
      },
      WS_ID,
    );
    const cloned = await cloneLayout(prisma, source.id, 'Clone Order', WS_ID);
    const detail = await getLayoutById(prisma, cloned!.id, WS_ID);
    const allocations = detail?.week_days_layouts[0].meal_slots[0].dish_allocations;
    expect(allocations?.[0].dish_type.id).toBe(DT_ID);
    expect(allocations?.[1].dish_type.id).toBe(DT_ID_2);
  });

  it('returns null for non-existent source', async () => {
    const result = await cloneLayout(prisma, '00000000-0000-0000-0000-999999999999', 'Clone', WS_ID);
    expect(result).toBeNull();
  });
});
