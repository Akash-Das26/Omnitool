import { describe, expect, it } from 'vitest';
import * as core from './index';

describe('tool-core public API', () => {
  it('re-exports every module through the package barrel', () => {
    for (const name of [
      'formatJson',
      'minifyJson',
      'validateJson',
      'decodeJwt',
      'encodeBase64',
      'decodeHex',
      'convertBase',
      'generatePassword',
      'countText',
      'pxToRem',
      'diffText',
      'generateUuids',
      'renderQrSvg',
      'buildOutputFilename',
    ]) {
      expect(core).toHaveProperty(name);
      expect(typeof (core as unknown as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
