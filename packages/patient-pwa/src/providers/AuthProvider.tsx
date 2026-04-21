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

const STORAGE_KEY_ACCESS_TOKEN = "carebridge_access_token";
const STORAGE_KEY_REFRESH_TOKEN = "carebridge_refresh_token";
const STORAGE_KEY_USER = "carebridge_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<PatientAuthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEY_USER);
        const accessToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);

        if (storedUser && accessToken) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error("Failed to restore auth state:", err);
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(credentials);

      // Store tokens and user data
      localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, response.accessToken);
      localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, response.refreshToken);
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

      // Store tokens and user data
      localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, response.accessToken);
      localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, response.refreshToken);
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
    const accessToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
    if (accessToken) {
      authApi.logout(accessToken).catch((err) => {
        console.error("Logout API call failed:", err);
      });
    }

    localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
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
