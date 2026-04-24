"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import {
  AuthContextType,
  LoginRequest,
  PatientAuthResponse,
  SignupRequest,
} from "@/types/auth";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

const STORAGE_KEY_USER = "carebridge_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<PatientAuthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from server-side session (httpOnly cookies).
  // We cache the user profile locally for fast hydration, but never store tokens in the browser.
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEY_USER);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }
      } catch (err) {
        console.error("Failed to restore auth state:", err);
        localStorage.removeItem(STORAGE_KEY_USER);
      } finally {
        // After local hydration, verify session with backend.
        authApi
          .getProfile()
          .then((profile) => {
            setUser(profile);
            setIsAuthenticated(true);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
          })
          .catch(() => {
            // No active session
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem(STORAGE_KEY_USER);
          })
          .finally(() => setIsLoading(false));
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(credentials);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(response));
      setUser(response);
      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: SignupRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.signup(data);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(response));

      setUser(response);
      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch((err) => {
      console.error("Logout API call failed:", err);
    });

    localStorage.removeItem(STORAGE_KEY_USER);

    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    error,
    login,
    signup,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
