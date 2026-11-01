import { describe, expect, it, vi } from 'vitest';
import { applyTheme, isTheme } from './theme';

describe('isTheme', () => {
  it('recognises valid themes only', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
    expect(isTheme('system')).toBe(false);
    expect(isTheme(null)).toBe(false);
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
