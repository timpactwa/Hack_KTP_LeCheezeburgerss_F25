import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { login as loginRequest, register as registerRequest } from "../services/api";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useCallback(async (credentials) => {
    setIsSubmitting(true);
    try {
      const response = await loginRequest(credentials);
      setToken(response.token);
      setUser(response.user);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setIsSubmitting(true);
    try {
      const response = await registerRequest(payload);
      setToken(response.token);
      setUser(response.user);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      register,
      logout,
      isSubmitting,
      isAuthenticated: Boolean(user),
    }),
    [user, token, login, register, logout, isSubmitting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
