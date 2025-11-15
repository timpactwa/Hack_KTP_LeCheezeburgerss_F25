/**
 * AuthContext stores the JWT/user profile and calls login/register APIs.
 * Downstream components (RouteForm, PanicButton) consume it for identity info.
 */
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
  const [lastAlertAt, setLastAlertAt] = useState(() => localStorage.getItem("sr_last_alert"));

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
    setLastAlertAt(null);
    localStorage.removeItem("sr_token");
    localStorage.removeItem("sr_user");
    localStorage.removeItem("sr_last_alert");
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  const recordAlert = useCallback((timestamp) => {
    if (!timestamp) return;
    setLastAlertAt(timestamp);
    localStorage.setItem("sr_last_alert", timestamp);
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

  useEffect(() => {
    if (lastAlertAt) {
      localStorage.setItem("sr_last_alert", lastAlertAt);
    }
  }, [lastAlertAt]);

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
      lastAlertAt,
      recordAlert,
    }),
    [user, token, login, register, logout, updateUser, isSubmitting, lastAlertAt, recordAlert]
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
