/**
 * The theme is resolved once, before first paint, by the inline boot script
 * (`apps/web/boot/boot.js`), which writes the `dark` class and `color-scheme` on
 * `<html>`. The app only reads that class back, so there is no second resolver
 * here that could disagree with what was painted.
 */
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'omnitool-theme';

export function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
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
