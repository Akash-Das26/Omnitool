import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest starts one worker per test file. With 70 files on a 16-core host
    // that oversubscribes the machine while the workers start up, and the
    // wall-clock guard in `sanitize.test.ts` (a 1 MB paste in under 2 s) read
    // 2,143 ms twice in a row at 1-minute load 8-17 while the same call took
    // 826 ms on its own. At half the cores the guard reads 994 ms and the
    // whole suite is green; the run costs about ten seconds more.
    maxWorkers: '50%',
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
      include: [
        'packages/tool-core/src/**/*.ts',
        'packages/tools-registry/src/**/*.ts',
        // The paste, drop and open-a-document converter turns untrusted markup
        // into the editor's model, so its refusals are measured like a
        // sanitiser's rather than left to the app project.
        'apps/web/src/tools/text-editor/model.ts',
      ],
      exclude: ['**/*.test.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        // Raised from 85 at the Batch 7A gate (DEC-70): every batch keeps
        // `tool-core` branch coverage at 90 or above, with tests that assert
        // behaviour rather than merely executing the line.
        branches: 90,
        statements: 90,
        // Per-file floors for the modules that handle untrusted input
        // (DEC-78). A sanitiser, a paste converter or a parser cannot hide
        // behind the global figure: its refusals are the product.
        'packages/tool-core/src/sanitize/index.ts': { branches: 90 },
        'apps/web/src/tools/text-editor/model.ts': { branches: 90 },
        'packages/tool-core/src/url/index.ts': { branches: 90 },
        'packages/tool-core/src/meta/index.ts': { branches: 90 },
        // `markdown/index.ts` carries 80 rather than 90: 40 of its 204 branches
        // need token types markdown-it 15.0.3 never emits with `html: false`
        // (raw HTML, a stray inline token, an unmatched close tag). The token
        // inventory test in `markdown.edges.test.ts` proves that claim, and
        // `IMPLEMENTATION.md` §9 lists the branches. Deleting the dead branches
        // or accepting the gap is the owner's call, not this file's.
        'packages/tool-core/src/markdown/index.ts': { branches: 80 },
      },
    },
  },
});
