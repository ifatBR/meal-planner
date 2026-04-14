import type { MealTypeResponse } from "@app/types";
import { API_BASE } from "../utils/constants";
import { apiFetch } from "./apiClient";

export const fetchMealTypes = async (): Promise<MealTypeResponse[]> => {
  const res = await apiFetch(`${API_BASE}/meal-types`, {
    credentials: "include",
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const createMealType = async (params: {
  name: string;
  color: string;
}): Promise<MealTypeResponse> => {
  const res = await apiFetch(`${API_BASE}/meal-types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const updateMealType = async (
  id: string,
  params: { name: string },
): Promise<MealTypeResponse> => {
  const res = await apiFetch(`${API_BASE}/meal-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const deleteMealType = async (id: string): Promise<void> => {
  const res = await apiFetch(`${API_BASE}/meal-types/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await res.json();
};
