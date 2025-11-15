import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { login as loginRequest, register as registerRequest } from "../services/api";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("sr_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("sr_token"));
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
    localStorage.removeItem("sr_token");
    localStorage.removeItem("sr_user");
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("sr_token", token);
    } else {
      localStorage.removeItem("sr_token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("sr_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("sr_user");
    }
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      register,
      logout,
      updateUser,
      isSubmitting,
      isAuthenticated: Boolean(user),
    }),
    [user, token, login, register, logout, updateUser, isSubmitting]
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
