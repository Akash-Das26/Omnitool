import { describe, expect, it } from 'vitest';
import { buildAcceptAttribute, matchesFilePattern } from './accepts';
import {
  buildOutputFilename,
  extensionForMime,
  formatBytes,
  sanitiseFilename,
  stripExtension,
} from './filename';

describe('matchesFilePattern', () => {
  it('matches wildcard MIME types', () => {
    expect(matchesFilePattern({ type: 'image/png', name: 'a.png' }, 'image/*')).toBe(true);
    expect(matchesFilePattern({ type: 'application/pdf', name: 'a.pdf' }, 'image/*')).toBe(false);
  });

  it('matches exact MIME types and extensions', () => {
    expect(matchesFilePattern({ type: 'application/pdf', name: 'a.pdf' }, 'application/pdf')).toBe(
      true,
    );
    expect(matchesFilePattern({ type: 'image/jxl', name: 'a.jxl' }, '.jxl')).toBe(true);
    expect(matchesFilePattern({ type: 'image/png', name: 'a.png' }, '.jpg')).toBe(false);
  });

  it('falls back to the extension when iOS reports no type', () => {
    expect(matchesFilePattern({ type: '', name: 'photo.JPG' }, 'image/*')).toBe(true);
    expect(matchesFilePattern({ type: '', name: 'photo.png' }, 'image/png')).toBe(true);
    expect(matchesFilePattern({ type: '', name: 'doc.pdf' }, 'image/*')).toBe(false);
  });

  it('rejects empty or unrelated patterns', () => {
    expect(matchesFilePattern({ type: 'image/png', name: 'a.png' }, '  ')).toBe(false);
    expect(matchesFilePattern({ type: 'image/png', name: 'a.png' }, 'video/mp4')).toBe(false);
  });
});

describe('buildAcceptAttribute', () => {
  it('expands wildcards with extensions for iOS', () => {
    const accept = buildAcceptAttribute(['image/*', '.jxl']);
    expect(accept).toContain('image/*');
    expect(accept).toContain('.png');
    expect(accept).toContain('.jxl');
  });

  it('deduplicates and lower-cases patterns', () => {
    const accept = buildAcceptAttribute(['.PNG', '.png', 'image/png']);
    expect(accept.split(',')).toEqual(['.png', 'image/png']);
  });
});

describe('filenames', () => {
  it('sanitises unsafe characters and paths', () => {
    expect(sanitiseFilename('../../my<file>?.png')).toBe('my-file-.png');
    expect(sanitiseFilename('   ')).toBe('download');
  });

  it('strips and replaces extensions', () => {
    expect(stripExtension('photo.raw.png')).toBe('photo.raw');
    expect(buildOutputFilename('photo.png', { suffix: '-converted', extension: 'jpg' })).toBe(
      'photo-converted.jpg',
    );
  });

  it('maps MIME types to extensions', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('application/octet-stream')).toBe('bin');
  });
});

describe('formatBytes', () => {
  it('formats byte counts with sensible precision', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1.00 kB');
    expect(formatBytes(1536)).toBe('1.50 kB');
    expect(formatBytes(10 * 1024 * 1024)).toBe('10.0 MB');
    expect(formatBytes(-1)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });
});
