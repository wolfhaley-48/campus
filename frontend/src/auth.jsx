import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const data = await api.get("/notifications");
      setUnread(data.unread ?? 0);
    } catch {
      // счётчик не критичен для работы кабинета
    }
  }, []);

  useEffect(() => {
    let alive = true;

    api
      .get("/auth/me")
      .then((data) => {
        if (!alive) return;
        setUser(data.user);
      })
      .catch(() => {
        // не авторизован — это нормальное состояние на странице входа
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    const onUnauthorized = () => {
      setUser(null);
      setUnread(0);
    };
    window.addEventListener("campus:unauthorized", onUnauthorized);
    return () => {
      alive = false;
      window.removeEventListener("campus:unauthorized", onUnauthorized);
    };
  }, [refreshUnread]);

  useEffect(() => {
    if (user) refreshUnread();
  }, [user, refreshUnread]);

  const login = useCallback(async (loginValue, password) => {
    const data = await api.post("/auth/login", {
      login: loginValue,
      password,
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
    setUnread(0);
  }, []);

  const value = useMemo(
    () => ({ user, loading, unread, login, logout, refreshUnread, setUnread }),
    [user, loading, unread, login, logout, refreshUnread],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth должен вызываться внутри AuthProvider");
  return context;
}
