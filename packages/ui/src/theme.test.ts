import { describe, expect, it, vi } from 'vitest';
import { applyTheme, isTheme, readStoredTheme, resolveInitialTheme } from './theme';

describe('resolveInitialTheme', () => {
  it('prefers a stored choice', () => {
    expect(resolveInitialTheme('light', true)).toBe('light');
    expect(resolveInitialTheme('dark', false)).toBe('dark');
  });

  it('falls back to the system preference', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme('nonsense', false)).toBe('light');
  });

  it('recognises valid themes only', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('system')).toBe(false);
  });
});

describe('applyTheme', () => {
  it('toggles the class, sets color-scheme and persists', () => {
    const root = document.createElement('html');
    const storage = { setItem: vi.fn() };

    applyTheme('dark', root, storage);

    expect(root.classList.contains('dark')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
    expect(storage.setItem).toHaveBeenCalledWith('omnitool-theme', 'dark');

    applyTheme('light', root, storage);
    expect(root.classList.contains('dark')).toBe(false);
  });
});

describe('readStoredTheme', () => {
  it('returns null when storage throws', () => {
    expect(
      readStoredTheme({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBeNull();
  });
});
