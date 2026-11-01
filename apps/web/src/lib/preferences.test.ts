import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  initialRailState,
  RAIL_ATTRIBUTE,
  RAIL_COLLAPSED,
  RAIL_EXPANDED,
  RAIL_STATE_KEY,
  THEME_DARK,
  THEME_STORAGE_KEY,
  UI_STORAGE_KEY,
} from './preferences';

/**
 * The boot script is inline HTML, so nothing imports it and nothing type-checks
 * it. This reads the same file the build inlines and fails if its storage keys,
 * state values or attribute names drift from the app's constants.
 */
// Vitest runs from the repository root (the E2E specs read `apps/web/dist` the
// same way); `import.meta.url` is an http URL under the jsdom environment.
const bootScript = readFileSync('apps/web/boot/boot.js', 'utf8');

describe('the inline boot script', () => {
  it('reads exactly the storage keys the app uses', () => {
    const keys = [...bootScript.matchAll(/localStorage\.getItem\(\s*'([^']+)'/g)].map(
      (match) => match[1],
    );
    expect(keys.sort()).toEqual([THEME_STORAGE_KEY, UI_STORAGE_KEY].sort());
  });

  it('uses the app’s rail field, attribute and values', () => {
    expect(bootScript).toContain(RAIL_STATE_KEY);
    expect(bootScript).toContain(RAIL_ATTRIBUTE);
    expect(bootScript).toContain(`'${RAIL_COLLAPSED}'`);
    expect(bootScript).toContain(`'${RAIL_EXPANDED}'`);
    expect(bootScript).toContain(`'${THEME_DARK}'`);
  });

  it('sets the theme the way the app reads it', () => {
    expect(bootScript).toContain("classList.toggle('dark'");
    expect(bootScript).toContain('colorScheme');
  });

  it('guards storage access and evaluates nothing', () => {
    expect(bootScript).toMatch(/try\s*\{/);
    expect(bootScript).toMatch(/catch/);
    expect(bootScript).not.toMatch(/\beval\(|new Function|document\.write/);
  });
});

describe('initialRailState', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute(RAIL_ATTRIBUTE);
  });

  it('reads the attribute the boot script writes', () => {
    document.documentElement.setAttribute(RAIL_ATTRIBUTE, RAIL_COLLAPSED);
    expect(initialRailState()).toBe(RAIL_COLLAPSED);
  });

  it('falls back to expanded when the attribute is absent or unknown', () => {
    expect(initialRailState()).toBe(RAIL_EXPANDED);
    document.documentElement.setAttribute(RAIL_ATTRIBUTE, 'sideways');
    expect(initialRailState()).toBe(RAIL_EXPANDED);
  });
});
