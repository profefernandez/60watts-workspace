"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import directus from "./directus";
import { readMe, login as sdkLogin, refresh as sdkRefresh, logout as sdkLogout, registerUser } from "@directus/sdk";

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, first_name?: string, last_name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  error: null,
  login: async () => { },
  register: async () => { },
  logout: async () => { },
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try to restore session on mount via token refresh
  useEffect(() => {
    (async () => {
      try {
        await directus.request(sdkRefresh({ mode: "json" }));
        const me = await directus.request(readMe({ fields: ["id", "email", "first_name", "last_name"] }));
        setUser(me as User);
      } catch {
        // No valid session — user needs to log in
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await directus.request(sdkLogin({ email, password }, { mode: "json" }));
      const me = await directus.request(readMe({ fields: ["id", "email", "first_name", "last_name"] }));
      setUser(me as User);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, _first_name?: string, _last_name?: string) => {
    setError(null);
    setLoading(true);
    try {
      // Attempt to register the user via Directus standard registration
      await directus.request(registerUser(email, password));
      // Once registered, log them in immediately
      await login(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please ensure public registration is enabled in your Directus settings.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await directus.request(sdkLogout({ mode: "json" }));
    } catch {
      // Ignore logout errors
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
