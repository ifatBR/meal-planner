import type { LayoutListItem } from '@app/types';
import { API_BASE } from '../utils/constants';
import { apiFetch } from './apiClient';

const LAYOUTS_URL = `${API_BASE}/layouts`;

export const fetchLayouts = async (): Promise<LayoutListItem[]> => {
  const res = await apiFetch(LAYOUTS_URL);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data.items;
};

export const deleteLayout = async (id: string): Promise<void> => {
  const res = await apiFetch(`${LAYOUTS_URL}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw await res.json();
};
