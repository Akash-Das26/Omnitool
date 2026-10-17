import { registerSW } from 'virtual:pwa-register';
import { create } from 'zustand';

interface PwaState {
  readonly needRefresh: boolean;
  readonly offlineReady: boolean;
  setNeedRefresh(value: boolean): void;
  setOfflineReady(value: boolean): void;
}

export const usePwaStore = create<PwaState>()((set) => ({
  needRefresh: false,
  offlineReady: false,
  setNeedRefresh: (value) => set({ needRefresh: value }),
  setOfflineReady: (value) => set({ offlineReady: value }),
}));

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

let updateServiceWorker: UpdateServiceWorker | null = null;

export function registerAppServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      usePwaStore.getState().setNeedRefresh(true);
    },
    onOfflineReady() {
      usePwaStore.getState().setOfflineReady(true);
    },
  });
}

export async function applyAppUpdate(): Promise<void> {
  await updateServiceWorker?.(true);
}
