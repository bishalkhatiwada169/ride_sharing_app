import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ride.app.mode.v1';

export type AppMode = 'passenger' | 'driver';

type ModeContextValue = {
  ready: boolean;
  mode: AppMode | null;
  setMode: (mode: AppMode) => Promise<void>;
  clearMode: () => Promise<void>;
};

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({children}: {children: React.ReactNode}) {
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<AppMode | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && (raw === 'passenger' || raw === 'driver')) {
          setModeState(raw);
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

  const setMode = useCallback(async (next: AppMode) => {
    setModeState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const clearMode = useCallback(async () => {
    setModeState(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ready, mode, setMode, clearMode}),
    [ready, mode, setMode, clearMode],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useAppMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error('useAppMode must be used within ModeProvider');
  }
  return ctx;
}
