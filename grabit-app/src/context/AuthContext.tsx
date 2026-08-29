/**
 * Grabit Authentication Context
 * In-memory state management for client-side Firebase Auth and backend synchronization.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginWithFirebase, signupWithFirebase, logoutFromFirebase } from '../services/firebase';
import { api } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notifications';

export const STORAGE_KEY = 'grabit_auth';
export const ONBOARDING_STORAGE_KEY = 'grabit_onboarding_seen';

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  name?: string;
  avatarUrl?: string;
  referralCode?: string;
  referredBy?: string | null;
  [key: string]: any;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBootstrapping: boolean;
  hasSeenOnboarding: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser?: (updated: Partial<AuthUser>) => void;
  completeOnboarding: () => Promise<void>;
  setHasSeenOnboarding?: (seen: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        const [savedAuth, onboardingSeen] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(ONBOARDING_STORAGE_KEY),
        ]);

        if (isMounted) {
          setHasSeenOnboarding(onboardingSeen === 'true');
        }

        if (!savedAuth) {
          if (isMounted) {
            setIsBootstrapping(false);
          }
          return;
        }

        const parsed = JSON.parse(savedAuth);
        if (parsed && parsed.token && parsed.user) {
          if (isMounted) {
            setToken(parsed.token);
            setUser(parsed.user);
            setIsAuthenticated(true);
          }
          api.setToken(parsed.token);

          // Verify with api.getCurrentUser(token)
          const verifyRes = await api.getCurrentUser(parsed.token);
          if (!verifyRes.success) {
            await AsyncStorage.removeItem(STORAGE_KEY);
            if (isMounted) {
              api.setToken(null);
              setUser(null);
              setToken(null);
              setIsAuthenticated(false);
            }
          } else if (verifyRes.data?.user && isMounted) {
            setUser({ ...parsed.user, ...verifyRes.data.user });
            registerForPushNotificationsAsync().catch((e) =>
              console.log('[AuthContext] Push registration error on bootstrap:', e)
            );
          }
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
          if (isMounted) {
            api.setToken(null);
            setUser(null);
            setToken(null);
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Bootstrap error:', err);
        try {
          await AsyncStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore error removing item
        }
        if (isMounted) {
          api.setToken(null);
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const clearError = () => {
    setError(null);
  };

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const fbResult = await loginWithFirebase(email, password);
      const syncResult = await api.syncUser(fbResult.token);

      const resolvedUser: AuthUser =
        syncResult.success && syncResult.data
          ? (syncResult.data.user || syncResult.data)
          : {
              id: fbResult.user.uid,
              email: fbResult.user.email,
              displayName: fbResult.user.displayName,
            };

      setUser(resolvedUser);
      setToken(fbResult.token);
      setIsAuthenticated(true);

      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token: fbResult.token, user: resolvedUser })
        );
      } catch (storageErr) {
        console.warn('[AuthContext] AsyncStorage setItem error:', storageErr);
      }

      registerForPushNotificationsAsync().catch((e) =>
        console.log('[AuthContext] Push registration error on login:', e)
      );
    } catch (err: any) {
      const errorMessage = err?.message || 'Login failed. Please verify your credentials.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    referralCode?: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const fbResult = await signupWithFirebase(name, email, password);
      const syncPayload: { displayName: string; referralCode?: string } = { displayName: name };
      if (referralCode && referralCode.trim()) {
        syncPayload.referralCode = referralCode.trim();
      }
      const syncResult = await api.syncUser(fbResult.token, syncPayload);

      const resolvedUser: AuthUser =
        syncResult.success && syncResult.data
          ? (syncResult.data.user || syncResult.data)
          : {
              id: fbResult.user.uid,
              email: fbResult.user.email,
              displayName: name || fbResult.user.displayName,
              referralCode: referralCode?.trim(),
            };

      setUser(resolvedUser);
      setToken(fbResult.token);
      setIsAuthenticated(true);

      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token: fbResult.token, user: resolvedUser })
        );
      } catch (storageErr) {
        console.warn('[AuthContext] AsyncStorage setItem error:', storageErr);
      }

      registerForPushNotificationsAsync().catch((e) =>
        console.log('[AuthContext] Push registration error on signup:', e)
      );
    } catch (err: any) {
      const errorMessage = err?.message || 'Sign up failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await logoutFromFirebase();
    } catch (err: any) {
      console.warn('[AuthContext] logout error:', err);
    } finally {
      try {
        await AsyncStorage.removeItem(STORAGE_KEY);
      } catch (storageErr) {
        console.warn('[AuthContext] failed to remove storage key:', storageErr);
      }
      api.setToken(null);
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const updateUser = (updated: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updated };
      try {
        AsyncStorage.getItem(STORAGE_KEY).then((savedAuth) => {
          if (savedAuth) {
            const parsed = JSON.parse(savedAuth);
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, user: nextUser })).catch(() => {});
          }
        }).catch(() => {});
      } catch {
        // safe fallback
      }
      return nextUser;
    });
  };

  const completeOnboarding = async (): Promise<void> => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch (storageErr) {
      console.warn('[AuthContext] AsyncStorage setItem onboarding error:', storageErr);
    }
    setHasSeenOnboarding(true);
  };

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading,
      isBootstrapping,
      hasSeenOnboarding,
      error,
      login,
      signup,
      logout,
      clearError,
      updateUser,
      completeOnboarding,
      setHasSeenOnboarding,
    }),
    [user, token, isAuthenticated, isLoading, isBootstrapping, hasSeenOnboarding, error]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
