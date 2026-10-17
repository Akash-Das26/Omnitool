import { applyTheme, readStoredTheme, resolveInitialTheme, type Theme } from '@omnitool/ui';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  readonly railCollapsed: boolean;
  toggleRail(): void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      railCollapsed: false,
      toggleRail: () => set((state) => ({ railCollapsed: !state.railCollapsed })),
    }),
    {
      name: 'omnitool-ui',
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

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: resolveInitialTheme(
    readStoredTheme(),
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  ),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
  },
}));

if (typeof document !== 'undefined') {
  const stored = currentTheme();
  if (useThemeStore.getState().theme !== stored) {
    useThemeStore.setState({ theme: stored });
  }
}

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
