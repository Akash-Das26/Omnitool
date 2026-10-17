import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  getTool,
  searchTools,
  TOOL_COUNT,
  TOOLS,
  toolsAccepting,
} from './index';

describe('registry', () => {
  it('loads every seeded tool exactly once', () => {
    expect(TOOL_COUNT).toBe(97);
    const ids = new Set(TOOLS.map((tool) => tool.id));
    expect(ids.size).toBe(97);
  });

  it('uses kebab-case ids and non-empty names', () => {
    for (const tool of TOOLS) {
      expect(tool.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(tool.name.length).toBeGreaterThan(0);
      expect(tool.href).toBe(`/tools/${tool.id}`);
      expect(tool.icon.length).toBeGreaterThan(0);
      expect(Array.isArray(tool.accepts)).toBe(true);
      expect(Array.isArray(tool.produces)).toBe(true);
    }
  });

  it('keeps descriptions as strings for the owner to fill in', () => {
    for (const tool of TOOLS) expect(typeof tool.description).toBe('string');
  });

  it('uses our own neutral category labels', () => {
    expect(CATEGORY_LABELS.experiments).toBe('Experiments');
    expect(CATEGORY_LABELS['turbo-nerd']).toBe('Turbo-nerd');
    expect(CATEGORIES.every((category) => category.tools.length > 0)).toBe(true);
  });

  it('keeps the home ordering', () => {
    expect(CATEGORIES[0]?.id).toBe('colour');
    expect(CATEGORIES.at(-1)?.id).toBe('experiments');
  });

  it('accepts the highlight flag from the seed', () => {
    expect(getTool('substrata')?.flags).toContain('highlight');
  });
});

describe('getTool', () => {
  it('finds a tool and returns undefined for unknown ids', () => {
    expect(getTool('uuid-genny')?.name).toBe('UUID Generator');
    expect(getTool('not-a-tool')).toBeUndefined();
  });
});

describe('searchTools', () => {
  it('matches names, ids and categories', () => {
    expect(searchTools('uuid').map((tool) => tool.id)).toContain('uuid-genny');
    expect(searchTools('colour').length).toBeGreaterThan(5);
  });

  it('filters by category', () => {
    const results = searchTools('', { category: 'pdf' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((tool) => tool.category === 'pdf')).toBe(true);
  });

  it('filters by accepted file', () => {
    const pngTools = searchTools('', { accepts: { type: 'image/png', name: 'photo.png' } });
    expect(pngTools.map((tool) => tool.id)).toContain('image-converter');
    expect(pngTools.map((tool) => tool.id)).not.toContain('pdf-organiser');
  });

  it('returns everything for an empty query', () => {
    expect(searchTools('').length).toBe(TOOL_COUNT);
  });
});

describe('toolsAccepting', () => {
  it('finds PDF tools for a PDF file', () => {
    const ids = toolsAccepting({ type: 'application/pdf', name: 'brief.pdf' }).map(
      (tool) => tool.id,
    );
    expect(ids).toContain('pdf-organiser');
    expect(ids).not.toContain('qr-genny');
  });
});
