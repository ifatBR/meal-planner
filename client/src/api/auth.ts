import { API_BASE } from '../utils/constants';

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
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const logout = async (): Promise<void> => {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
};

export const refreshToken = async (): Promise<{ accessToken: string }> => {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};

export const getMe = async (accessToken: string): Promise<AuthUser> => {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  });
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data;
};
