import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { router } from '@/app/router';
import { RouterProvider } from '@/lib/navigation';
import { registerAppServiceWorker } from '@/lib/pwa';
import '@/styles/app.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

registerAppServiceWorker();
