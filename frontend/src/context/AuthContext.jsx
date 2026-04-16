import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { auth as authAPI } from '../utils/api';

const AuthContext = createContext(null);

const PLAN_ORDER = ['free', 'lite', 'pro', 'ultimate'];

export function AuthProvider({ children, syncUserCurrency }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const syncRef = useRef(syncUserCurrency);
  syncRef.current = syncUserCurrency; // always current without stale closure

  useEffect(() => {
    const token  = localStorage.getItem('wc_token');
    const stored = localStorage.getItem('wc_user');

    if (token && stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Sync currency from stored user immediately (before network)
        if (syncRef.current) syncRef.current(parsed);
      } catch { /* bad JSON — ignore */ }

      authAPI.me()
        .then(res => {
          setUser(res.user);
          localStorage.setItem('wc_user', JSON.stringify(res.user));
          // Sync currency from fresh server data
          if (syncRef.current) syncRef.current(res.user);
        })
        .catch(() => {
          localStorage.removeItem('wc_token');
          localStorage.removeItem('wc_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  const login = useCallback(({ token, user: u }) => {
    localStorage.setItem('wc_token',  token);
    localStorage.setItem('wc_user',   JSON.stringify(u));
    setUser(u);
    if (syncRef.current) syncRef.current(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wc_token');
    localStorage.removeItem('wc_user');
    localStorage.removeItem('wc_currency');
    setUser(null);
  }, []);

  const updateUser = useCallback(updates => {
    setUser(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('wc_user', JSON.stringify(next));
      if (syncRef.current) syncRef.current(next);
      return next;
    });
  }, []);

  /* Admin bypasses all plan restrictions */
  const canAccess = useCallback(requiredPlan => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const effective = (user.trialActive && user.trialPlan)
      ? user.trialPlan
      : (user.plan || 'free');
    return PLAN_ORDER.indexOf(effective) >= PLAN_ORDER.indexOf(requiredPlan);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
