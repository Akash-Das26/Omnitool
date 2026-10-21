import { TOOLS } from '@omnitool/tools-registry';
import { describe, expect, it } from 'vitest';
import {
  IMPLEMENTED_TOOL_COUNT,
  IMPLEMENTED_TOOL_IDS,
  isToolImplemented,
  loadTool,
  TOOL_LOADERS,
} from './tool-modules';

describe('tool modules', () => {
  it('lists only the tools that exist', () => {
    expect(Object.keys(TOOL_LOADERS).sort()).toEqual(
      [
        'base-converter',
        'braille-converter',
        'cron-builder',
        'decoder',
        'encoder',
        'http-status',
        'image-converter',
        'json-formatter',
        'jwt-decoder',
        'large-type',
        'line-height-calc',
        'meta-tag-genny',
        'morse-code',
        'nato-phonetic',
        'paper-sizes',
        'password-genny',
        'px-to-rem',
        'qr-genny',
        'regex-tester',
        'sci-calc',
        'tailwind-cheatsheet',
        'text-diff',
        'time-calc',
        'typo-calc',
        'unit-converter',
        'uuid-genny',
        'word-counter',
      ].sort(),
    );
  });

  it('reports implemented ids', () => {
    expect(isToolImplemented('uuid-genny')).toBe(true);
    expect(isToolImplemented('colour-converter')).toBe(false);
  });

  it('returns a loader for implemented tools and nothing for planned tools', () => {
    expect(typeof loadTool('qr-genny')).toBe('function');
    expect(loadTool('pdf-organiser')).toBeUndefined();
  });

  it('derives built and planned tools from the loader map, agreeing with the registry', () => {
    const registryIds = TOOLS.map((tool) => tool.id).sort();
    const built = TOOLS.filter((tool) => isToolImplemented(tool.id)).map((tool) => tool.id);

    // Built comes only from the loader map, and every loader has a registry row.
    expect([...IMPLEMENTED_TOOL_IDS].sort()).toEqual(Object.keys(TOOL_LOADERS).sort());
    expect(built.sort()).toEqual(Object.keys(TOOL_LOADERS).sort());
    expect(IMPLEMENTED_TOOL_COUNT).toBe(built.length);

    // Planned is the exact complement: no loader, and no route to load.
    for (const id of registryIds) {
      if (built.includes(id)) continue;
      expect(loadTool(id)).toBeUndefined();
      expect(isToolImplemented(id)).toBe(false);
    }

    // The two sets partition the registry, so counts can be derived without a
    // second hand-kept list.
    expect(built.length + registryIds.filter((id) => !built.includes(id)).length).toBe(
      TOOLS.length,
    );
  });
});
