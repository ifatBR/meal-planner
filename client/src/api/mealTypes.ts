import type {
  MealTypeResponse,
  CreateMealTypeInput,
  UpdateMealTypeInput,
} from "@app/types";
import { API_BASE } from "../utils/constants";
import { apiFetch } from "./apiClient";

const MEAL_TYPES_URL = `${API_BASE}/meal-types`;

export const fetchMealTypes = async (): Promise<MealTypeResponse[]> => {
  const res = await apiFetch(MEAL_TYPES_URL, {
    credentials: "include",
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const createMealType = async (
  params: CreateMealTypeInput,
): Promise<MealTypeResponse> => {
  const res = await apiFetch(MEAL_TYPES_URL, {
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
  params: UpdateMealTypeInput,
): Promise<MealTypeResponse> => {
  const res = await apiFetch(`${MEAL_TYPES_URL}/${id}`, {
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
  const res = await apiFetch(`${MEAL_TYPES_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw await res.json();
};
