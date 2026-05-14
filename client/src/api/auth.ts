import { API_BASE } from "../utils/constants";

const AUTH_URL = `${API_BASE}/auth`;

export interface LoginParams {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  userName: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export const login = async (params: LoginParams): Promise<LoginResponse> => {
  const res = await fetch(`${AUTH_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const logout = async (): Promise<void> => {
  await fetch(`${AUTH_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
};

export const refreshToken = async (): Promise<{ accessToken: string }> => {
  const res = await fetch(`${AUTH_URL}/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const getMe = async (
  accessToken: string,
): Promise<{ user: AuthUser }> => {
  const res = await fetch(`${AUTH_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};
