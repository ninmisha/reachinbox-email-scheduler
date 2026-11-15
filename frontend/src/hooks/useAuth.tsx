import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { User } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthState>({ user: null, loading: true, logout: async () => undefined, refresh: async () => undefined });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const refresh = useCallback(async () => {
    setUser(await api.me());
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, logout, refresh }}>{children}</Ctx.Provider>;
}
