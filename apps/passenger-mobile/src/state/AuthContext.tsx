import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import * as authApi from '../services/auth-api';
import {setUnauthorizedHandler} from '../services/api-client';
import {registerDevice} from '../services/notification-api';
import type {AuthUser, TokenPair} from '../types/ride';

const STORAGE_KEY = 'ride.passenger.session.v1';

type Session = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type AuthContextValue = {
  ready: boolean;
  session: Session | null;
  signIn: (tokens: TokenPair) => Promise<void>;
  signOut: () => Promise<void>;
  accessToken: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persist(session: Session | null) {
  if (!session) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const clearSession = useCallback(async () => {
    setSession(null);
    await persist(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw) as Session;
        try {
          const refreshed = await authApi.refreshSession(parsed.refreshToken);
          if (cancelled) {
            return;
          }
          const next: Session = {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            user: refreshed.user,
          };
          setSession(next);
          await persist(next);
        } catch {
          if (!cancelled) {
            setSession(null);
            await persist(null);
          }
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (tokens: TokenPair) => {
    const next: Session = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: tokens.user,
    };
    setSession(next);
    await persist(next);
    try {
      await registerDevice(
        tokens.accessToken,
        Platform.OS,
        `passenger-device-${tokens.user.id}`,
      );
    } catch {
      // device register is best-effort (mock push gateway)
    }
  }, []);

  const signOut = useCallback(async () => {
    const current = session;
    await clearSession();
    if (current) {
      try {
        await authApi.logout(current.accessToken, current.refreshToken);
      } catch {
        // local session already cleared
      }
    }
  }, [session, clearSession]);

  const value = useMemo(
    () => ({
      ready,
      session,
      signIn,
      signOut,
      accessToken: session?.accessToken ?? null,
    }),
    [ready, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
