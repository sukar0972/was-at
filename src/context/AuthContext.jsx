import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  setupInitialAdmin as apiSetup,
  fetchSetupStatus,
  getCurrentUser,
  fetchMe,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const status = await fetchSetupStatus();
        setNeedsSetup(Boolean(status?.needsSetup));

        const token = localStorage.getItem('vt_token');
        if (token && !status?.needsSetup) {
          const u = await fetchMe();
          setUser(u);
        } else if (status?.needsSetup) {
          apiLogout();
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await apiLogin(username, password);
    setUser(result.user);
    return result;
  }, []);

  const setupAdmin = useCallback(async (data) => {
    const result = await apiSetup(data);
    setNeedsSetup(false);
    setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        needsSetup,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.is_admin,
        login,
        setupAdmin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
