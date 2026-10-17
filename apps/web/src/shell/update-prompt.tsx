import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { applyAppUpdate, usePwaStore } from '@/lib/pwa';

export function UpdatePrompt() {
  const needRefresh = usePwaStore((state) => state.needRefresh);
  const offlineReady = usePwaStore((state) => state.offlineReady);
  const setOfflineReady = usePwaStore((state) => state.setOfflineReady);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex max-w-sm items-start gap-3 rounded-panel border border-border bg-popover p-3 text-sm text-popover-foreground shadow-popover"
    >
      <p className="pt-1">
        {needRefresh
          ? 'A new version of Omnitool is available.'
          : 'Omnitool is ready to work offline.'}
      </p>
      <div className="ml-auto flex items-center gap-1">
        {needRefresh ? (
          <Button type="button" size="sm" onClick={() => void applyAppUpdate()}>
            Refresh
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Dismiss offline notice"
            onClick={() => setOfflineReady(false)}
          >
            <XIcon aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
