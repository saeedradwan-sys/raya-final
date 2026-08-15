import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { PortalSession, PortalShipment } from '@/lib/types';
import {
  clearSession,
  fetchPortalShipments,
  isSessionExpired,
  loadSession,
  portalLogin,
  revalidatePortalSession,
  type PortalLoginResult,
} from '@/lib/portalAuth';

interface PortalAuthContextValue {
  session: PortalSession | null;
  shipments: PortalShipment[];
  loading: boolean;
  login: (taxNumber: string, accessCode: string) => Promise<PortalLoginResult>;
  logout: () => void;
  isAuthenticated: boolean;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [shipments, setShipments] = useState<PortalShipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = loadSession();
      if (!existing) {
        if (!cancelled) {
          setSession(null);
          setLoading(false);
        }
        return;
      }
      const validated = await revalidatePortalSession(existing);
      const loadedShipments = validated ? await fetchPortalShipments(validated) : [];
      if (!cancelled) {
        setSession(validated);
        setShipments(loadedShipments);
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
      clearSession();
      setSession(null);
      setShipments([]);
      return;
    }
    const timer = window.setTimeout(() => {
      clearSession();
      setSession(null);
      setShipments([]);
    }, ms);
    return () => window.clearTimeout(timer);
  }, [session]);

  const login = useCallback(
    async (taxNumber: string, accessCode: string): Promise<PortalLoginResult> => {
      const result = await portalLogin(taxNumber, accessCode);
      if (result.ok) {
        setSession(result.session);
        setShipments(await fetchPortalShipments(result.session));
      }
      return result;
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setShipments([]);
  }, []);


  const value: PortalAuthContextValue = {
    session,
    shipments,
    loading,
    login,
    logout,
    isAuthenticated: !!session && !isSessionExpired(session),
  };

  return (
    <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error('usePortalAuth must be used within PortalAuthProvider');
  return ctx;
}
