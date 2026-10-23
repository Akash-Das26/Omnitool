import type { ComponentType } from 'react';

export type ToolModule = { readonly default: ComponentType };

/**
 * Only tools that exist are listed here. The registry keeps the full catalogue;
 * rows for unbuilt tools render as planned and do not link anywhere.
 */
export const TOOL_LOADERS: Readonly<Record<string, () => Promise<ToolModule>>> = {
  'uuid-genny': () => import('@/tools/uuid-genny'),
  'qr-genny': () => import('@/tools/qr-genny'),
  'image-converter': () => import('@/tools/image-converter'),
  'json-formatter': () => import('@/tools/json-formatter'),
  'jwt-decoder': () => import('@/tools/jwt-decoder'),
  encoder: () => import('@/tools/encoder'),
  'base-converter': () => import('@/tools/base-converter'),
  'password-genny': () => import('@/tools/password-genny'),
  'word-counter': () => import('@/tools/word-counter'),
  'px-to-rem': () => import('@/tools/px-to-rem'),
  'text-diff': () => import('@/tools/text-diff'),
  'morse-code': () => import('@/tools/morse-code'),
  'nato-phonetic': () => import('@/tools/nato-phonetic'),
  'braille-converter': () => import('@/tools/braille-converter'),
  'unit-converter': () => import('@/tools/unit-converter'),
  'time-calc': () => import('@/tools/time-calc'),
  'line-height-calc': () => import('@/tools/line-height-calc'),
  'typo-calc': () => import('@/tools/typo-calc'),
  'paper-sizes': () => import('@/tools/paper-sizes'),
  'http-status': () => import('@/tools/http-status'),
  'cron-builder': () => import('@/tools/cron-builder'),
  'meta-tag-genny': () => import('@/tools/meta-tag-genny'),
  decoder: () => import('@/tools/decoder'),
  'large-type': () => import('@/tools/large-type'),
  'graph-calc': () => import('@/tools/graph-calc'),
  'markdown-writer': () => import('@/tools/markdown-writer'),
  'glyph-browser': () => import('@/tools/glyph-browser'),
  'regex-tester': () => import('@/tools/regex-tester'),
  'recipe-table': () => import('@/tools/recipe-table'),
  'sci-calc': () => import('@/tools/sci-calc'),
  'stupid-units': () => import('@/tools/stupid-units'),
  'tailwind-cheatsheet': () => import('@/tools/tailwind-cheatsheet'),
};

/**
 * The loader map is the single source of truth for what is built. Home, the
 * omnibox, the rail and the router all derive availability from these keys, so
 * adding a tool is one entry here plus its registry row.
 */
export const IMPLEMENTED_TOOL_IDS: readonly string[] = Object.freeze(Object.keys(TOOL_LOADERS));

export const IMPLEMENTED_TOOL_COUNT = IMPLEMENTED_TOOL_IDS.length;

export function isToolImplemented(id: string): boolean {
  return Object.hasOwn(TOOL_LOADERS, id);
}

export function loadTool(id: string): (() => Promise<ToolModule>) | undefined {
  return Object.hasOwn(TOOL_LOADERS, id) ? TOOL_LOADERS[id] : undefined;
}
