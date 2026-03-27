/**
 * Dev seed script — populates a workspace with realistic test data.
 *
 * Usage:
 *   SEED_WORKSPACE_ID=<your-workspace-id> npx tsx prisma/seed-dev.ts
 *
 * Requires the workspace to already exist and its ingredients to be seeded
 * (via the normal workspace bootstrap flow). Safe to re-run.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const WS_ID = process.env.SEED_WORKSPACE_ID;
if (!WS_ID) {
  console.error('Missing SEED_WORKSPACE_ID env var');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Data definitions
// ---------------------------------------------------------------------------

const DISH_TYPES = ['Main', 'Salad', 'Soup', 'Side', 'Dessert'];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];

// Ingredient names used by recipes — must already exist in the workspace
const RECIPE_INGREDIENT_NAMES = [
  'chicken',
  'beef',
  'salmon',
  'tuna',
  'eggplant',
  'tomato',
  'potato',
  'lentils',
  'chickpeas',
  'rice',
];

// Populated by load functions before seeding recipes/layout
const ids: {
  dishTypes: Record<string, string>;
  mealTypes: Record<string, string>;
  ingredients: Record<string, string>;
} = {
  dishTypes: {},
  mealTypes: {},
  ingredients: {},
};

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedDishTypes() {
  console.log('Seeding dish types...');
  for (const name of DISH_TYPES) {
    const dt = await prisma.dishType.upsert({
      where: { workspace_id_name: { workspace_id: WS_ID!, name } },
      update: {},
      create: { workspace_id: WS_ID!, name },
    });
    ids.dishTypes[name] = dt.id;
  }
}

async function seedMealTypes() {
  console.log('Seeding meal types...');
  for (const name of MEAL_TYPES) {
    const mt = await prisma.mealType.upsert({
      where: { workspace_id_name: { workspace_id: WS_ID!, name } },
      update: {},
      create: { workspace_id: WS_ID!, name },
    });
    ids.mealTypes[name] = mt.id;
  }
}

async function loadIngredientIds() {
  console.log('Loading ingredient IDs from DB...');
  const ingredients = await prisma.ingredient.findMany({
    where: { workspace_id: WS_ID!, name: { in: RECIPE_INGREDIENT_NAMES } },
    select: { id: true, name: true },
  });

  for (const ing of ingredients) {
    ids.ingredients[ing.name] = ing.id;
  }

  const missing = RECIPE_INGREDIENT_NAMES.filter((n) => !ids.ingredients[n]);
  if (missing.length > 0) {
    console.error(`\nMissing ingredients in DB: ${missing.join(', ')}`);
    console.error('Make sure the workspace ingredients are seeded first.');
    process.exit(1);
  }
}

async function seedRecipes() {
  console.log('Seeding recipes...');

  const recipes: Array<{
    name: string;
    instructions: string | null;
    mainIngredient: string;
    dishTypes: string[];
    mealTypes: string[];
  }> = [
    // Chicken
    {
      name: 'Grilled Chicken Breast',
      instructions: 'Season chicken, grill on medium-high heat for 6-7 minutes per side.',
      mainIngredient: 'chicken',
      dishTypes: ['Main'],
      mealTypes: ['Lunch', 'Dinner'],
    },
    {
      name: 'Chicken Soup',
      instructions: 'Simmer chicken with vegetables and herbs for 45 minutes.',
      mainIngredient: 'chicken',
      dishTypes: ['Soup'],
      mealTypes: ['Lunch', 'Dinner'],
    },
    {
      name: 'Chicken and Rice',
      instructions: 'Cook chicken thighs over a bed of seasoned rice.',
      mainIngredient: 'chicken',
      dishTypes: ['Main'],
      mealTypes: ['Lunch', 'Dinner'],
    },

    // Beef
    {
      name: 'Beef Stew',
      instructions: 'Brown beef, add vegetables and stock, slow cook for 2 hours.',
      mainIngredient: 'beef',
      dishTypes: ['Main'],
      mealTypes: ['Lunch', 'Dinner'],
    },
    {
      name: 'Spaghetti Bolognese',
      instructions: 'Cook ground beef with tomato sauce, serve over pasta.',
      mainIngredient: 'beef',
      dishTypes: ['Main'],
      mealTypes: ['Lunch', 'Dinner'],
    },

    // Salmon
    {
      name: 'Baked Salmon',
      instructions: 'Season fillet with lemon and herbs, bake at 200°C for 15 minutes.',
      mainIngredient: 'salmon',
      dishTypes: ['Main'],
      mealTypes: ['Lunch', 'Dinner'],
    },
    {
      name: 'Salmon Salad',
      instructions: 'Flake smoked salmon over greens, dress with olive oil and lemon.',
      mainIngredient: 'salmon',
      dishTypes: ['Salad'],
      mealTypes: ['Lunch'],
    },

    // Tuna
    {
      name: 'Tuna Pasta',
      instructions: 'Mix canned tuna with pasta, olive oil, and capers.',
      mainIngredient: 'tuna',
      dishTypes: ['Main'],
      mealTypes: ['Lunch', 'Dinner'],
    },
    {
      name: 'Tuna Salad',
      instructions: 'Mix tuna with mayo, celery, and onion.',
      mainIngredient: 'tuna',
      dishTypes: ['Salad'],
      mealTypes: ['Lunch'],
    },

    // Vegetable-based
    {
      name: 'Roasted Eggplant',
      instructions: 'Halve eggplant, score, drizzle with olive oil, roast at 220°C for 30 minutes.',
      mainIngredient: 'eggplant',
      dishTypes: ['Side', 'Main'],
      mealTypes: ['Lunch', 'Dinner'],
    },
    {
      name: 'Tomato Soup',
      instructions: 'Roast tomatoes and garlic, blend with stock and cream.',
      mainIngredient: 'tomato',
      dishTypes: ['Soup'],
      mealTypes: ['Lunch', 'Dinner'],
    },
    {
      name: 'Mashed Potato',
      instructions: 'Boil potatoes, mash with butter and warm milk.',
      mainIngredient: 'potato',
      dishTypes: ['Side'],
      mealTypes: ['Lunch', 'Dinner'],
    },

    // Legumes
    {
      name: 'Red Lentil Soup',
      instructions: 'Sauté onion and garlic, add lentils and stock, simmer 25 minutes, blend.',
      mainIngredient: 'lentils',
      dishTypes: ['Soup'],
      mealTypes: ['Lunch', 'Dinner'],
    },
    {
      name: 'Hummus',
      instructions: 'Blend chickpeas with tahini, lemon, and garlic until smooth.',
      mainIngredient: 'chickpeas',
      dishTypes: ['Side', 'Salad'],
      mealTypes: ['Breakfast', 'Lunch'],
    },

    // Rice-based
    {
      name: 'Vegetable Rice',
      instructions: 'Cook basmati rice with mixed vegetables and spices.',
      mainIngredient: 'rice',
      dishTypes: ['Side', 'Main'],
      mealTypes: ['Lunch', 'Dinner'],
    },
  ];

  for (const recipe of recipes) {
    const existing = await prisma.recipe.findFirst({
      where: { workspace_id: WS_ID!, name: recipe.name },
    });
    if (existing) continue;

    await prisma.recipe.create({
      data: {
        workspace_id: WS_ID!,
        name: recipe.name,
        instructions: recipe.instructions,
        recipe_ingredients: {
          create: [
            {
              ingredient_id: ids.ingredients[recipe.mainIngredient],
              is_main: true,
              display_name: null,
            },
          ],
        },
        recipe_dish_types: {
          create: recipe.dishTypes.map((dt) => ({ dish_type_id: ids.dishTypes[dt] })),
        },
        recipe_meal_types: {
          create: recipe.mealTypes.map((mt) => ({ meal_type_id: ids.mealTypes[mt] })),
        },
      },
    });
  }
}

async function seedLayout() {
  console.log('Seeding layout...');

  const existing = await prisma.layout.findFirst({
    where: { workspace_id: WS_ID!, name: 'Standard Week' },
  });
  if (existing) {
    console.log('  Layout already exists, skipping.');
    return;
  }

  await prisma.layout.create({
    data: {
      workspace_id: WS_ID!,
      name: 'Standard Week',
      week_days_layouts: {
        create: [
          {
            // Sun–Thu
            days: [0, 1, 2, 3, 4],
            meal_slots: {
              create: [
                {
                  order: 0,
                  meal_type_id: ids.mealTypes['Breakfast'],
                  dish_allocations: {
                    create: [
                      { dish_type_id: ids.dishTypes['Main'], amount: 1 },
                      { dish_type_id: ids.dishTypes['Side'], amount: 1 },
                    ],
                  },
                },
                {
                  order: 1,
                  meal_type_id: ids.mealTypes['Lunch'],
                  dish_allocations: {
                    create: [
                      { dish_type_id: ids.dishTypes['Main'], amount: 2 },
                      { dish_type_id: ids.dishTypes['Salad'], amount: 1 },
                      { dish_type_id: ids.dishTypes['Soup'], amount: 1 },
                    ],
                  },
                },
                {
                  order: 2,
                  meal_type_id: ids.mealTypes['Dinner'],
                  dish_allocations: {
                    create: [
                      { dish_type_id: ids.dishTypes['Main'], amount: 2 },
                      { dish_type_id: ids.dishTypes['Side'], amount: 1 },
                    ],
                  },
                },
              ],
            },
          },
          {
            // Fri
            days: [5],
            meal_slots: {
              create: [
                {
                  order: 0,
                  meal_type_id: ids.mealTypes['Breakfast'],
                  dish_allocations: {
                    create: [{ dish_type_id: ids.dishTypes['Main'], amount: 1 }],
                  },
                },
                {
                  order: 1,
                  meal_type_id: ids.mealTypes['Lunch'],
                  dish_allocations: {
                    create: [
                      { dish_type_id: ids.dishTypes['Main'], amount: 2 },
                      { dish_type_id: ids.dishTypes['Salad'], amount: 1 },
                    ],
                  },
                },
              ],
            },
          },
          {
            // Sat
            days: [6],
            meal_slots: {
              create: [
                {
                  order: 0,
                  meal_type_id: ids.mealTypes['Lunch'],
                  dish_allocations: {
                    create: [
                      { dish_type_id: ids.dishTypes['Main'], amount: 1 },
                      { dish_type_id: ids.dishTypes['Soup'], amount: 1 },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Seeding workspace: ${WS_ID}\n`);

  await seedDishTypes();
  await seedMealTypes();
  await loadIngredientIds();
  await seedRecipes();
  await seedLayout();

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
