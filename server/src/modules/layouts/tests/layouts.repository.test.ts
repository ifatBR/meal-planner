import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getLayoutById, getMealSlotsByLayoutId, reorderMealSlots } from '../layouts.repository';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const WS_ID = '00000000-0000-0000-0004-000000000001';
const SCHED_ID = '00000000-0000-0000-0004-000000000002';
const MT_ID = '00000000-0000-0000-0004-000000000003';

beforeAll(async () => {
  await prisma.workspace.upsert({
    where: { id: WS_ID },
    update: {},
    create: { id: WS_ID, name: 'Test Workspace' },
  });
  await prisma.schedule.upsert({
    where: { workspace_id_name: { workspace_id: WS_ID, name: 'Test Schedule' } },
    update: {},
    create: {
      id: SCHED_ID,
      name: 'Test Schedule',
      workspace_id: WS_ID,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-01-31'),
    },
  });
});

beforeEach(async () => {
  await prisma.dishAllocation.deleteMany();
  await prisma.mealSlot.deleteMany();
  await prisma.weekDaysLayout.deleteMany({ where: { schedule_id: SCHED_ID } });
  await prisma.mealType.upsert({
    where: { id: MT_ID },
    update: {},
    create: { id: MT_ID, name: 'Test Meal Type', workspace_id: WS_ID },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('getLayoutById', () => {
  it('returns layout with schedule workspace_id', async () => {
    const layout = await prisma.weekDaysLayout.create({
      data: { days: [1, 2, 3], schedule_id: SCHED_ID },
    });
    const result = await getLayoutById(prisma, layout.id);
    expect(result?.id).toBe(layout.id);
    expect(result?.schedule.workspace_id).toBe(WS_ID);
  });

  it('returns null for non-existent layout', async () => {
    const result = await getLayoutById(prisma, '00000000-0000-0000-0000-999999999999');
    expect(result).toBeNull();
  });
});

describe('getMealSlotsByLayoutId', () => {
  it('returns slots ordered by order', async () => {
    const layout = await prisma.weekDaysLayout.create({
      data: { days: [1, 2, 3], schedule_id: SCHED_ID },
    });
    await prisma.mealSlot.createMany({
      data: [
        { week_days_layout_id: layout.id, meal_type_id: MT_ID, order: 1 },
        { week_days_layout_id: layout.id, meal_type_id: MT_ID, order: 0 },
      ],
    });
    const result = await getMealSlotsByLayoutId(prisma, layout.id);
    expect(result).toHaveLength(2);
    expect(result[0].order).toBe(0);
    expect(result[1].order).toBe(1);
  });

  it('returns empty array for layout with no slots', async () => {
    const layout = await prisma.weekDaysLayout.create({
      data: { days: [5, 6], schedule_id: SCHED_ID },
    });
    const result = await getMealSlotsByLayoutId(prisma, layout.id);
    expect(result).toHaveLength(0);
  });
});

describe('reorderMealSlots', () => {
  it('updates order values for all slots', async () => {
    const layout = await prisma.weekDaysLayout.create({
      data: { days: [0], schedule_id: SCHED_ID },
    });
    const [slot1, slot2] = await Promise.all([
      prisma.mealSlot.create({
        data: { week_days_layout_id: layout.id, meal_type_id: MT_ID, order: 0 },
      }),
      prisma.mealSlot.create({
        data: { week_days_layout_id: layout.id, meal_type_id: MT_ID, order: 1 },
      }),
    ]);

    await reorderMealSlots(prisma, [
      { id: slot1.id, order: 1 },
      { id: slot2.id, order: 0 },
    ]);

    const updated = await getMealSlotsByLayoutId(prisma, layout.id);
    const slot1After = updated.find((s) => s.id === slot1.id);
    const slot2After = updated.find((s) => s.id === slot2.id);
    expect(slot1After?.order).toBe(1);
    expect(slot2After?.order).toBe(0);
  });
});
