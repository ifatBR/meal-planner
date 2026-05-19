import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) throw new Error('No workspace found in DB');

  const mealTypes = await prisma.mealType.findMany({
    where: { workspace_id: workspace.id },
    orderBy: { created_at: 'asc' },
  });
  const dishTypes = await prisma.dishType.findMany({
    where: { workspace_id: workspace.id },
    orderBy: { created_at: 'asc' },
  });

  if (!mealTypes.length) throw new Error('No meal types found — add them first');
  if (!dishTypes.length) throw new Error('No dish types found — add them first');

  const existing = await prisma.layout.findFirst({
    where: { workspace_id: workspace.id, name: 'Standard Week' },
  });
  if (existing) {
    console.log('Layout "Standard Week" already exists, skipping.');
    return;
  }

  const dayGroups = [
    { days: [1, 2, 3, 4, 5] },
    { days: [0, 6] },
  ];

  await prisma.layout.create({
    data: {
      name: 'Standard Week',
      workspace_id: workspace.id,
      week_days_layouts: {
        create: dayGroups.map((group) => ({
          days: group.days,
          meal_slots: {
            create: mealTypes.map((mt, order) => ({
              meal_type_id: mt.id,
              order,
              dish_allocations: {
                create: dishTypes.map((dt, dOrder) => ({
                  dish_type_id: dt.id,
                  amount: 1,
                  order: dOrder,
                })),
              },
            })),
          },
        })),
      },
    },
  });

  console.log(`Layout "Standard Week" created for workspace ${workspace.id}`);
  console.log(`  Meal types: ${mealTypes.map((mt) => mt.name).join(', ')}`);
  console.log(`  Dish types: ${dishTypes.map((dt) => dt.name).join(', ')}`);
  console.log(`  Day groups: Mon–Fri | Sat–Sun`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
