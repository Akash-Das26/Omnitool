import { describe, expect, it } from 'vitest';
import {
  buildOutputFilename,
  extensionForMime,
  formatBytes,
  sanitiseFilename,
  stripExtension,
} from './filename';

describe('extensionForMime', () => {
  it('maps the formats the tools produce, whatever the case', () => {
    expect(extensionForMime('image/png')).toBe('png');
    expect(extensionForMime('IMAGE/JPEG')).toBe('jpg');
    expect(extensionForMime('text/markdown')).toBe('md');
  });

  it('falls back to bin for anything it does not know', () => {
    expect(extensionForMime('application/x-made-up')).toBe('bin');
    expect(extensionForMime('')).toBe('bin');
  });
});

describe('stripExtension', () => {
  it('removes only the last extension', () => {
    expect(stripExtension('archive.tar.gz')).toBe('archive.tar');
    expect(stripExtension('photo.png')).toBe('photo');
  });

  it('leaves a name without an extension, or a dot file, alone', () => {
    expect(stripExtension('README')).toBe('README');
    expect(stripExtension('.bashrc')).toBe('.bashrc');
    expect(stripExtension('trailing.')).toBe('trailing');
  });

  it('takes the file name out of a path', () => {
    expect(stripExtension('a/b/c/report.pdf')).toBe('report');
    expect(stripExtension('C:\\Users\\me\\notes.txt')).toBe('notes');
  });
});

describe('sanitiseFilename', () => {
  it('replaces characters a file system refuses and control characters', () => {
    expect(sanitiseFilename('a<b>c:d"e|f?g*h.txt')).toBe('a-b-c-d-e-f-g-h.txt');
    expect(sanitiseFilename('tab\there.txt')).toBe('tab-here.txt');
    expect(sanitiseFilename('cr\rhere.txt')).toBe('cr-here.txt');
  });

  it('collapses repeated dashes and trims dots, spaces and dashes from the ends', () => {
    expect(sanitiseFilename('..--name  with   spaces---..')).toBe('name with spaces');
    expect(sanitiseFilename('  .hidden.  ')).toBe('hidden');
  });

  it('takes the last path segment', () => {
    expect(sanitiseFilename('../../etc/passwd')).toBe('passwd');
  });

  it('caps the length at 120 characters', () => {
    expect(sanitiseFilename('a'.repeat(200))).toHaveLength(120);
  });

  it('uses the fallback when nothing usable is left', () => {
    expect(sanitiseFilename('...')).toBe('download');
    expect(sanitiseFilename('', 'output')).toBe('output');
  });
});

describe('buildOutputFilename', () => {
  it('keeps the base name and adds the suffix and extension', () => {
    expect(buildOutputFilename('photo.png', { suffix: '-small', extension: 'jpg' })).toBe(
      'photo-small.jpg',
    );
    expect(buildOutputFilename('photo.png', { extension: '.webp' })).toBe('photo.webp');
  });

  it('works with no options at all', () => {
    expect(buildOutputFilename('photo.png')).toBe('photo');
  });

  it('falls back to output when the name has nothing usable', () => {
    expect(buildOutputFilename('...png', { extension: 'png' })).toBe('output.png');
  });
});

describe('formatBytes', () => {
  it('reports bytes under a kilobyte as whole bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('steps up the units and keeps the right number of decimals', () => {
    expect(formatBytes(1024)).toBe('1.00 kB');
    expect(formatBytes(1536)).toBe('1.50 kB');
    expect(formatBytes(10 * 1024)).toBe('10.0 kB');
    expect(formatBytes(150 * 1024)).toBe('150 kB');
    expect(formatBytes(5 * 1024 ** 2)).toBe('5.00 MB');
    expect(formatBytes(1024 ** 3)).toBe('1.00 GB');
    expect(formatBytes(1024 ** 4)).toBe('1.00 TB');
  });

  it('stops at terabytes rather than inventing a unit', () => {
    expect(formatBytes(2048 * 1024 ** 4)).toBe('2048 TB');
  });

  it('says nothing for a number that is not a size', () => {
    expect(formatBytes(-1)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('—');
  });
});
