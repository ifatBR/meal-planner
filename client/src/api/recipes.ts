import type { RecipeResponse, UpdateRecipeBody, CreateRecipeBody } from '@app/types';
import { API_BASE } from '../utils/constants';
import { apiFetch } from './apiClient';

const RECIPES_URL = `${API_BASE}/recipes`;

export type RecipesPage = {
  items: RecipeResponse[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export const fetchRecipes = async (page = 1, search?: string): Promise<RecipesPage> => {
  const params = new URLSearchParams({ page: String(page), pageSize: '10' });
  if (search) params.set('search', search);
  const res = await apiFetch(`${RECIPES_URL}?${params}`);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const fetchRecipeById = async (id: string): Promise<RecipeResponse> => {
  const res = await apiFetch(`${RECIPES_URL}/${id}`);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const updateRecipe = async (id: string, body: UpdateRecipeBody): Promise<RecipeResponse> => {
  const res = await apiFetch(`${RECIPES_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const createRecipe = async (body: CreateRecipeBody): Promise<RecipeResponse> => {
  const res = await apiFetch(RECIPES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const deleteRecipe = async (id: string): Promise<void> => {
  const res = await apiFetch(`${RECIPES_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw await res.json();
};
