import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { StaffSession } from '@/lib/staffAuth';
import { pullRecordsFromServer } from '@/lib/recordStore';
import {
  clearStaffSession,
  isStaffSessionExpired,
  loadStaffSession,
  revalidateStaffSession,
  staffLogin,
  type StaffLoginResult,
} from '@/lib/staffAuth';

interface StaffAuthContextValue {
  session: StaffSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<StaffLoginResult>;
  logout: () => void;
}

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadStaffSession();
      if (!local) {
        if (!cancelled) {
          setSession(null);
          setLoading(false);
        }
        return;
      }
      const validated = await revalidateStaffSession(local);
      if (validated) await pullRecordsFromServer();
      if (!cancelled) {
        setSession(validated);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const ms = new Date(session.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      clearStaffSession();
      setSession(null);
      return;
    }
    const timer = window.setTimeout(() => {
      clearStaffSession();
      setSession(null);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [session]);

  const login = useCallback(async (token: string): Promise<StaffLoginResult> => {
    const result = await staffLogin(token);
    if (result.ok) {
      await pullRecordsFromServer();
      setSession(result.session);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    clearStaffSession();
    setSession(null);
  }, []);

  return (
    <StaffAuthContext.Provider
      value={{
        session,
        loading,
        isAuthenticated: !!session && !isStaffSessionExpired(session),
        login,
        logout,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider');
  return ctx;
}
