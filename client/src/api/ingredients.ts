import type {
  IngredientResponse,
  CreateIngredientInput,
  UpdateIngredientInput,
  AddVariantInput,
  UpdateVariantInput,
} from '@app/types';
import { API_BASE } from '../utils/constants';
import { apiFetch } from './apiClient';

export type IngredientsPage = {
  items: IngredientResponse[];
  meta: { page: number; totalPages: number };
};

export const fetchIngredients = async (
  page: number,
  search?: string,
): Promise<IngredientsPage> => {
  const params = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (search) params.set('search', search);
  const res = await apiFetch(`${API_BASE}/ingredients?${params}`);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const createIngredient = async (
  body: CreateIngredientInput,
): Promise<IngredientResponse> => {
  const res = await apiFetch(`${API_BASE}/ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const updateIngredient = async (
  id: string,
  body: UpdateIngredientInput,
): Promise<IngredientResponse> => {
  const res = await apiFetch(`${API_BASE}/ingredients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const deleteIngredient = async (id: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE}/ingredients/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await res.json();
};

export const addVariant = async (
  ingredientId: string,
  body: AddVariantInput,
): Promise<{ id: string; variant: string }> => {
  const res = await apiFetch(`${API_BASE}/ingredients/${ingredientId}/variants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const updateVariant = async (
  ingredientId: string,
  variantId: string,
  body: UpdateVariantInput,
): Promise<{ id: string; variant: string }> => {
  const res = await apiFetch(
    `${API_BASE}/ingredients/${ingredientId}/variants/${variantId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const deleteVariant = async (
  ingredientId: string,
  variantId: string,
): Promise<void> => {
  const res = await apiFetch(
    `${API_BASE}/ingredients/${ingredientId}/variants/${variantId}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw await res.json();
};
