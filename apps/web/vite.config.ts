import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Preload the primary latin font (Schibsted Grotesk Variable, ~47 kB).
 *
 * The shell renders from an empty `#root`, so the font is only discovered
 * once React has painted text, which puts the fetch on the LCP critical
 * path: Lighthouse reports ~700 ms of "element render delay" on tool pages,
 * dominated by waiting for this file. Preloading starts it with the HTML.
 * The mono keycap font and the latin-ext subset stay lazy on purpose; they
 * are small and not part of the LCP text.
 */
/**
 * Inline the pre-paint boot script.
 *
 * It was an external `/theme.js`: a render-blocking request for 784 bytes that
 * Lighthouse charged 305 ms against, and it could not carry the rail preference
 * because that was read after hydration. One inline script now does both, and
 * `scripts/prerender.mjs` hashes its exact content into the CSP.
 */
function inlineBootScript(): Plugin {
  const source = readFileSync(new URL('./boot/boot.js', import.meta.url), 'utf8').trim();
  return {
    name: 'inline-boot-script',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes('<!-- boot-script -->')) {
          throw new Error('index.html is missing the <!-- boot-script --> placeholder');
        }
        return html.replace('<!-- boot-script -->', () => `<script>${source}</script>`);
      },
    },
  };
}

function preloadPrimaryFont(): Plugin {
  return {
    name: 'preload-primary-font',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const font = Object.values(ctx.bundle ?? {}).find(
          (entry) =>
            entry.type === 'asset' &&
            /^assets\/schibsted-grotesk-latin-wght-normal-.*\.woff2$/.test(entry.fileName),
        );
        if (!font) return;
        return [
          {
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'font',
              type: 'font/woff2',
              href: `/${font.fileName}`,
              crossorigin: '',
            },
            injectTo: 'head',
          },
        ];
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    inlineBootScript(),
    preloadPrimaryFont(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Omnitool',
        short_name: 'Omnitool',
        description: 'A local-only toolkit of small browser tools. Files never leave your browser.',
        theme_color: '#EDF0F3',
        background_color: '#EDF0F3',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en-GB',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'omnitool-wasm-v1',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Unicode block data is a same-origin JSON file, fetched when a
            // block is opened. Not precached (it is 11 MB in total), cached on
            // first use so a block that has been seen works offline.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/unicode/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'omnitool-unicode-v1',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname === 'cdn.jsdelivr.net' ||
              url.hostname === 'huggingface.co' ||
              url.hostname.endsWith('.hf.co'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'omnitool-models-v1',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    manifest: true,
  },
});
