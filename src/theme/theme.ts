import { darkColors, lightColors, type ThemeColorSet } from './colors';

export type ThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';

export const THEME_STORAGE_KEY = 'pest99-crm-theme';

export const THEME_MODES: ThemeMode[] = ['LIGHT', 'DARK', 'SYSTEM'];

export function normalizeThemeMode(value: unknown): ThemeMode {
  const v = String(value ?? '').trim().toUpperCase();
  if (v === 'DARK' || v === 'SYSTEM') return v;
  return 'LIGHT';
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'DARK') return 'dark';
  if (mode === 'LIGHT') return 'light';
  return systemPrefersDark() ? 'dark' : 'light';
}

export function themeColorsForMode(effective: 'light' | 'dark'): ThemeColorSet {
  return effective === 'dark' ? darkColors : lightColors;
}

export function readStoredTheme(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    return normalizeThemeMode(raw);
  } catch {
    return null;
  }
}

export function writeStoredTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function applyThemeToDocument(mode: ThemeMode): 'light' | 'dark' {
  const effective = resolveEffectiveTheme(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', effective === 'dark');
  root.dataset.theme = effective;
  root.style.colorScheme = effective;
  return effective;
}

/** Inject CRM CSS variables on :root (called when theme changes). */
export function applyThemeCssVariables(effective: 'light' | 'dark'): void {
  const c = themeColorsForMode(effective);
  const root = document.documentElement;
  root.style.setProperty('--crm-background', c.background);
  root.style.setProperty('--crm-surface', c.surface);
  root.style.setProperty('--crm-surface-2', c.surface2);
  root.style.setProperty('--crm-text', c.text);
  root.style.setProperty('--crm-text-muted', c.textMuted);
  root.style.setProperty('--crm-border', c.border);
  root.style.setProperty('--crm-input', c.input);
  root.style.setProperty('--crm-input-border', c.inputBorder);
  root.style.setProperty('--crm-hover', c.hover);
  root.style.setProperty('--crm-overlay', c.overlay);
  root.style.setProperty('--crm-chart-grid', c.chartGrid);
  root.style.setProperty('--crm-chart-text', c.chartText);
}
