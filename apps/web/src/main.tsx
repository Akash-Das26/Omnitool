import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { router } from '@/app/router';
import { RouterProvider } from '@/lib/navigation';
import { registerAppServiceWorker } from '@/lib/pwa';
import '@/styles/app.css';

/**
 * Boot marker for the E2E guards: `html[data-app-ready]` appears once React has
 * committed the first render, so its effects (the shell's keyboard listener,
 * the omnibox store) are live. It sits after `RouterProvider` so its effect runs
 * after the tree it announces. It renders nothing and is not styled.
 */
function AppReady() {
  useEffect(() => {
    document.documentElement.dataset.appReady = 'true';
    return () => {
      delete document.documentElement.dataset.appReady;
    };
  }, []);

  return null;
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
    <AppReady />
  </StrictMode>,
);

registerAppServiceWorker();
