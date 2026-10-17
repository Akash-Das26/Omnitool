import { describe, expect, it } from 'vitest';
import { isToolImplemented, loadTool, TOOL_LOADERS } from './tool-modules';

describe('tool modules', () => {
  it('lists only the three sample tools', () => {
    expect(Object.keys(TOOL_LOADERS).sort()).toEqual(['image-converter', 'qr-genny', 'uuid-genny']);
  });

  it('reports implemented ids', () => {
    expect(isToolImplemented('uuid-genny')).toBe(true);
    expect(isToolImplemented('colour-converter')).toBe(false);
  });

  it('returns a loader for implemented tools and nothing for planned tools', () => {
    expect(typeof loadTool('qr-genny')).toBe('function');
    expect(loadTool('pdf-organiser')).toBeUndefined();
  });
});
