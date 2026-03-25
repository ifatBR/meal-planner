export const PERMISSIONS = {
  INGREDIENTS: {
    CREATE: { domain: 'ingredients', key: 'create' },
    UPDATE: { domain: 'ingredients', key: 'update' },
    DELETE: { domain: 'ingredients', key: 'delete' },
  },
  DISH_TYPES: {
    CREATE: { domain: 'dish-types', key: 'create' },
    UPDATE: { domain: 'dish-types', key: 'update' },
    DELETE: { domain: 'dish-types', key: 'delete' },
  },
  MEAL_TYPES: {
    CREATE: { domain: 'meal-types', key: 'create' },
    UPDATE: { domain: 'meal-types', key: 'update' },
    DELETE: { domain: 'meal-types', key: 'delete' },
  },
  LAYOUTS: {
    CREATE: { domain: 'layouts', key: 'create' },
    UPDATE: { domain: 'layouts', key: 'update' },
    DELETE: { domain: 'layouts', key: 'delete' },
  },
  RECIPES: {
    CREATE: { domain: 'recipes', key: 'create' },
    UPDATE: { domain: 'recipes', key: 'update' },
    DELETE: { domain: 'recipes', key: 'delete' },
  },
  SCHEDULES: {
    CREATE: { domain: 'schedules', key: 'create' },
    UPDATE: { domain: 'schedules', key: 'update' },
    DELETE: { domain: 'schedules', key: 'delete' },
  },
  SCHEDULE_MEALS: {
    CREATE: { domain: 'schedule-meals', key: 'create' },
    UPDATE: { domain: 'schedule-meals', key: 'update' },
    DELETE: { domain: 'schedule-meals', key: 'delete' },
  },
  USERS: {
    READ: { domain: 'users', key: 'read' },
    CREATE: { domain: 'users', key: 'create' },
    UPDATE: { domain: 'users', key: 'update' },
    DELETE: { domain: 'users', key: 'delete' },
  },
  PERMISSIONS: {
    READ: { domain: 'permissions', key: 'read' },
    CREATE: { domain: 'permissions', key: 'create' },
    UPDATE: { domain: 'permissions', key: 'update' },
    DELETE: { domain: 'permissions', key: 'delete' },
  },
} as const;
