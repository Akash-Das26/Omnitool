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
};

export function isToolImplemented(id: string): boolean {
  return id in TOOL_LOADERS;
}

export function loadTool(id: string): (() => Promise<ToolModule>) | undefined {
  return TOOL_LOADERS[id];
}
