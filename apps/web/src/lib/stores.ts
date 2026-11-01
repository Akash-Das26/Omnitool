import { applyTheme, type Theme } from '@omnitool/ui';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialRailState, RAIL_COLLAPSED, UI_STORAGE_KEY } from './preferences';

interface UiState {
  readonly railCollapsed: boolean;
  toggleRail(): void;
}

// Seeded from what the inline boot script already painted, not from storage: a
// second source would let hydration move the rail after first paint.
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      railCollapsed: initialRailState() === RAIL_COLLAPSED,
      toggleRail: () => set((state) => ({ railCollapsed: !state.railCollapsed })),
    }),
    {
      name: UI_STORAGE_KEY,
      partialize: (state) => ({ railCollapsed: state.railCollapsed }),
    },
  ),
);

function currentTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

interface ThemeState {
  readonly theme: Theme;
  setTheme(theme: Theme): void;
  toggleTheme(): void;
}

// Likewise seeded from the class the boot script already set. Reading storage a
// second time would let a blocked or stale preference repaint after hydration.
export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: currentTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },
}));

export interface IntakeFile {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

interface OmniboxState {
  readonly open: boolean;
  readonly file: IntakeFile | null;
  openOmnibox(file?: IntakeFile | null): void;
  closeOmnibox(): void;
}

export const useOmniboxStore = create<OmniboxState>()((set) => ({
  open: false,
  file: null,
  openOmnibox: (file = null) => set({ open: true, file }),
  closeOmnibox: () => set({ open: false, file: null }),
}));

export function toIntakeFile(file: File): IntakeFile {
  return { name: file.name, type: file.type, size: file.size };
}
