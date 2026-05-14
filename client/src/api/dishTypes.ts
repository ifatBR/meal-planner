import type { DishTypeResponse } from '@app/types';
import { API_BASE } from '../utils/constants';
import { apiFetch } from './apiClient';

const DISH_TYPES_URL = `${API_BASE}/dish-types`;

export const fetchDishTypes = async (): Promise<DishTypeResponse[]> => {
  const res = await apiFetch(DISH_TYPES_URL);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const createDishType = async (params: {
  name: string;
}): Promise<DishTypeResponse> => {
  const res = await apiFetch(DISH_TYPES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const updateDishType = async (
  id: string,
  params: { name: string },
): Promise<DishTypeResponse> => {
  const res = await apiFetch(`${API_BASE}/dish-types/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const deleteDishType = async (id: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE}/dish-types/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw await res.json();
};
