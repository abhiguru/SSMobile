import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightPaperTheme, darkPaperTheme } from './paperTheme';
import type { AppTheme } from './paperTheme';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = '@theme_mode';

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  theme: AppTheme;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'system',
  setMode: () => {},
  isDark: false,
  theme: lightPaperTheme,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const theme = isDark ? darkPaperTheme : lightPaperTheme;

  const value = useMemo(() => ({ mode, setMode, isDark, theme }), [mode, setMode, isDark, theme]);

  if (!loaded) return null;

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
