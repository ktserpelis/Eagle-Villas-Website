// src/hooks/useAuth.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, setAuthToken } from "../api/client";

export type UserRole = "CUSTOMER" | "ADMIN";

export interface AuthUser {
  id: number;
  name?: string | null;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

interface LoginResponse {
  user: AuthUser;
  token: string;
}

interface RegisterResponse {
  user: AuthUser;
  token: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate auth from token and verify it by calling /auth/me
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      setLoading(false);
      return;
    }

    setTokenState(storedToken);
    setAuthToken(storedToken);

    api
      .get<{ user: AuthUser }>("/auth/me")
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setAuthToken(null);
        setUser(null);
        setTokenState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const authSuccess = (u: AuthUser, t: string) => {
    setUser(u);
    setTokenState(t);
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setAuthToken(t);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post<LoginResponse>("/auth/login", { email, password });
    authSuccess(res.data.user, res.data.token);
    return res.data.user;
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post<RegisterResponse>("/auth/register", {
      name,
      email,
      password,
    });
    authSuccess(res.data.user, res.data.token);
    return res.data.user;
  };

  const logout = () => {
    setUser(null);
    setTokenState(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
