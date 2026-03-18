// Use it for one time run when you want to test the db with ingredients
//run it in the cli with: npx tsx prisma/seed-workspace-ingredients.ts <workspaceid>
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import globalIngredients from './global-ingredients.json';
import 'dotenv/config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const workspaceId = process.argv[2];

if (!workspaceId) {
  console.error('Usage: tsx prisma/seed-workspace-ingredients.ts <workspaceId>');
  process.exit(1);
}

async function main() {
  console.log(`Seeding ingredients for workspace ${workspaceId}...`);

  for (const ingredient of globalIngredients) {
    const created = await prisma.ingredient.upsert({
      where: {
        workspace_id_name: {
          workspace_id: workspaceId,
          name: ingredient.name,
        },
      },
      update: {},
      create: {
        name: ingredient.name,
        category: ingredient.category,
        workspace_id: workspaceId,
      },
    });

    for (const variant of ingredient.variants) {
      await prisma.ingredientVariant.upsert({
        where: {
          workspace_id_variant: {
            workspace_id: workspaceId,
            variant,
          },
        },
        update: {},
        create: {
          variant,
          ingredient_id: created.id,
          workspace_id: workspaceId,
        },
      });
    }
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
