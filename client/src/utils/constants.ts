import { COLORS } from '../styles/designTokens';

export const ROUTES = {
  LOGIN: '/login',
  LIBRARY: '/library',
  SCHEDULES: '/schedules',
  SCHEDULE_SETTINGS: (id: string) => `/schedules/${id}/settings`,
  SCHEDULE_CALENDAR: (id: string) => `/schedules/${id}/calendar`,
  // For route definitions
  SCHEDULE_SETTINGS_PATTERN: '/schedules/:id/settings',
  SCHEDULE_CALENDAR_PATTERN: '/schedules/:id/calendar',
} as const;

export const MEAL_TYPE_COLORS = [
  COLORS.palette[1],
  COLORS.palette[2],
  COLORS.palette[3],
  COLORS.palette[4],
  COLORS.palette[5],
  COLORS.palette[6],
  COLORS.palette[7],
  COLORS.palette[8],
] as const;

export const API_BASE = '/api/v1';
