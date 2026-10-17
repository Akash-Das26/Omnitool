export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'omnitool-theme';

export function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}

export function resolveInitialTheme(
  stored: string | null | undefined,
  prefersDark: boolean,
): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(
  theme: Theme,
  root: Pick<HTMLElement, 'classList' | 'style'> = document.documentElement,
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): void {
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  storage?.setItem(THEME_STORAGE_KEY, theme);
}

export function readStoredTheme(
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined'
    ? null
    : localStorage,
): string | null {
  try {
    return storage?.getItem(THEME_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}
