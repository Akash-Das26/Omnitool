import { useEffect } from 'react';
import { Omnibox } from '@/components/omnibox';
import { Outlet } from '@/lib/navigation';
import { useOmniboxStore } from '@/lib/stores';
import { Footer } from './footer';
import { Header } from './header';
import { Rail } from './rail';
import { UpdatePrompt } from './update-prompt';

export function AppShell() {
  const openOmnibox = useOmniboxStore((state) => state.openOmnibox);
  const closeOmnibox = useOmniboxStore((state) => state.closeOmnibox);
  const omniboxOpen = useOmniboxStore((state) => state.open);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (omniboxOpen) closeOmnibox();
        else openOmnibox();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeOmnibox, omniboxOpen, openOmnibox]);

  return (
    <div className="min-h-dvh">
      <SecureContextNotice />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Header />
      <div className="flex">
        <Rail />
        <div className="min-w-0 flex-1">
          <main id="main">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
      <Omnibox />
      <UpdatePrompt />
    </div>
  );
}

function SecureContextNotice() {
  if (typeof window === 'undefined' || window.isSecureContext) return null;

  return (
    <div
      role="status"
      className="border-b border-border bg-highlight px-4 py-2 text-sm text-highlight-foreground"
    >
      This page is not being served over HTTPS. Omnitool still works, but offline mode, clipboard
      access and some tools will be unavailable. Open the secure HTTPS address to use them.
    </div>
  );
}
