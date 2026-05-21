import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { enhancedApiService } from '../services/api.enhanced';
import type { ThemeColorSet } from './colors';
import {
  applyThemeCssVariables,
  applyThemeToDocument,
  normalizeThemeMode,
  readStoredTheme,
  resolveEffectiveTheme,
  themeColorsForMode,
  writeStoredTheme,
  type ThemeMode,
} from './theme';

export interface ThemeContextValue {
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColorSet;
  setTheme: (mode: ThemeMode) => void;
  isSyncing: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function hasAccessToken(): boolean {
  try {
    return Boolean(localStorage.getItem('access_token'));
  } catch {
    return false;
  }
}

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(
    () => readStoredTheme() ?? 'LIGHT',
  );
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() =>
    resolveEffectiveTheme(readStoredTheme() ?? 'LIGHT'),
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const applyLocal = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    writeStoredTheme(mode);
    const effective = applyThemeToDocument(mode);
    applyThemeCssVariables(effective);
    setEffectiveTheme(effective);
  }, []);

  useEffect(() => {
    applyLocal(theme);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (theme !== 'SYSTEM') return;
      const effective = applyThemeToDocument('SYSTEM');
      applyThemeCssVariables(effective);
      setEffectiveTheme(effective);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const syncFromServer = useCallback(async () => {
    if (!hasAccessToken()) return;
    try {
      const { theme: serverTheme } = await enhancedApiService.getUserTheme();
      applyLocal(normalizeThemeMode(serverTheme));
    } catch {
      /* keep localStorage theme */
    }
  }, [applyLocal]);

  useEffect(() => {
    syncFromServer();
    const onAuth = () => syncFromServer();
    window.addEventListener('pest99-theme-sync', onAuth);
    return () => window.removeEventListener('pest99-theme-sync', onAuth);
  }, [syncFromServer]);

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      const normalized = normalizeThemeMode(mode);
      applyLocal(normalized);

      if (!hasAccessToken()) return;

      setIsSyncing(true);
      enhancedApiService
        .updateUserTheme(normalized)
        .catch((err) => console.warn('Failed to save theme preference', err))
        .finally(() => setIsSyncing(false));
    },
    [applyLocal],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      effectiveTheme,
      isDark: effectiveTheme === 'dark',
      colors: themeColorsForMode(effectiveTheme),
      setTheme,
      isSyncing,
    }),
    [theme, effectiveTheme, setTheme, isSyncing],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
