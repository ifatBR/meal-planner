import React, { createContext, useEffect, useRef, useState } from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  refreshToken,
  getMe,
} from "../api/auth";
import type { AuthUser, LoginParams } from "../api/auth";
import { setAccessTokenGetter } from "../api/apiClient";

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (params: LoginParams) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    setAccessTokenGetter(() => accessTokenRef.current);

    const init = async () => {
      try {
        const { accessToken: token } = await refreshToken();
        const me = await getMe(token);
        accessTokenRef.current = token;
        setAccessToken(token);
        setUser(me.user);
      } catch {
        accessTokenRef.current = null;
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (params: LoginParams) => {
    const { user, accessToken: token } = await apiLogin(params);
    accessTokenRef.current = token;
    setAccessToken(token);
    setUser(user);
  };

  const logout = async () => {
    await apiLogout();
    accessTokenRef.current = null;
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
