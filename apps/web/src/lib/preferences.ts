import { THEME_STORAGE_KEY } from '@omnitool/ui';

/**
 * The contract between the inline boot script (`apps/web/boot/boot.js`) and the
 * app. The script runs before first paint and writes the theme class and the rail
 * attribute on `<html>`; the stores read those, never the storage, so hydration
 * cannot change what was already painted. `preferences.test.ts` fails if the
 * script and these constants drift apart.
 */
export { THEME_STORAGE_KEY };

/** Zustand persist key for the UI store; the value is `{ state: { railCollapsed } }`. */
export const UI_STORAGE_KEY = 'omnitool-ui';
export const RAIL_STATE_KEY = 'railCollapsed';
export const RAIL_ATTRIBUTE = 'data-rail';

export type RailState = 'collapsed' | 'expanded';

export const RAIL_COLLAPSED: RailState = 'collapsed';
export const RAIL_EXPANDED: RailState = 'expanded';
export const THEME_DARK = 'dark';

/** What the boot script left on `<html>`, read before React mounts. */
export function initialRailState(): RailState {
  if (typeof document === 'undefined') return RAIL_EXPANDED;
  const value = document.documentElement.getAttribute(RAIL_ATTRIBUTE);
  return value === RAIL_COLLAPSED ? RAIL_COLLAPSED : RAIL_EXPANDED;
}
