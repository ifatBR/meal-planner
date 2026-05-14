import type { RecipeResponse } from '@app/types';
import { API_BASE } from '../utils/constants';
import { apiFetch } from './apiClient';

const RECIPES_URL = `${API_BASE}/recipes`;

export type RecipesPage = {
  items: RecipeResponse[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export const fetchRecipes = async (page = 1): Promise<RecipesPage> => {
  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  const res = await apiFetch(`${RECIPES_URL}?${params}`);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const deleteRecipe = async (id: string): Promise<void> => {
  const res = await apiFetch(`${RECIPES_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw await res.json();
};
