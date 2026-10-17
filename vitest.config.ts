import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'tool-core',
          environment: 'node',
          include: ['packages/tool-core/src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'tools-registry',
          environment: 'node',
          include: ['packages/tools-registry/src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['packages/ui/src/**/*.test.ts'],
        },
      },
      {
        resolve: {
          alias: {
            '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)),
          },
        },
        test: {
          name: 'web',
          environment: 'jsdom',
          setupFiles: ['apps/web/src/test/setup.ts'],
          include: ['apps/web/src/**/*.test.{ts,tsx}'],
          css: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/tool-core/src/**/*.ts', 'packages/tools-registry/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
