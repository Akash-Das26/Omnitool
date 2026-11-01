import { describe, expect, it } from 'vitest';
import {
  categoryName,
  characterOf,
  formatCodePoint,
  htmlEntity,
  isValidCodePoint,
  MAX_CODE_POINT,
  parseCodePoint,
  utf8Bytes,
} from './index';

describe('formatCodePoint', () => {
  it('pads to four digits and uses upper-case hex', () => {
    expect(formatCodePoint(0x41)).toBe('U+0041');
    expect(formatCodePoint(0x1f600)).toBe('U+1F600');
    expect(formatCodePoint(0x0)).toBe('U+0000');
  });

  it('rejects values outside Unicode', () => {
    expect(formatCodePoint(MAX_CODE_POINT + 1)).toBe('not a code point');
    expect(formatCodePoint(-1)).toBe('not a code point');
  });
});

describe('utf8Bytes', () => {
  it('encodes each UTF-8 length', () => {
    expect(utf8Bytes(0x41)).toEqual([0x41]);
    expect(utf8Bytes(0xe9)).toEqual([0xc3, 0xa9]);
    expect(utf8Bytes(0x20ac)).toEqual([0xe2, 0x82, 0xac]);
    expect(utf8Bytes(0x1f600)).toEqual([0xf0, 0x9f, 0x98, 0x80]);
  });

  it('matches TextEncoder for a range of characters', () => {
    const encoder = new TextEncoder();
    for (const cp of [0x00, 0x7f, 0x80, 0x7ff, 0x800, 0xffff, 0x10000, 0x10ffff, 0x4e00]) {
      expect(utf8Bytes(cp)).toEqual([...encoder.encode(String.fromCodePoint(cp))]);
    }
  });

  it('returns nothing for an invalid code point', () => {
    expect(utf8Bytes(-5)).toEqual([]);
    expect(utf8Bytes(0x110000)).toEqual([]);
  });
});

describe('htmlEntity', () => {
  it('names the five HTML-significant characters', () => {
    expect(htmlEntity(0x26)).toBe('&amp;');
    expect(htmlEntity(0x3c)).toBe('&lt;');
    expect(htmlEntity(0x3e)).toBe('&gt;');
    expect(htmlEntity(0x22)).toBe('&quot;');
    expect(htmlEntity(0x27)).toBe('&#39;');
  });

  it('uses a hexadecimal reference otherwise', () => {
    expect(htmlEntity(0xa9)).toBe('&#xA9;');
    expect(htmlEntity(0x1f600)).toBe('&#x1F600;');
  });
});

describe('parseCodePoint', () => {
  it('reads the forms the box accepts', () => {
    expect(parseCodePoint('U+1F600')).toBe(0x1f600);
    expect(parseCodePoint('u+41')).toBe(0x41);
    expect(parseCodePoint('0x20AC')).toBe(0x20ac);
    expect(parseCodePoint('1F600')).toBe(0x1f600);
    expect(parseCodePoint('0041')).toBe(0x41);
    expect(parseCodePoint('é')).toBe(0xe9);
  });

  it('refuses what it cannot read', () => {
    expect(parseCodePoint('')).toBeNull();
    expect(parseCodePoint('xyz')).toBeNull();
    expect(parseCodePoint('U+110000')).toBeNull();
    expect(parseCodePoint('123')).toBeNull();
  });
});

describe('characterOf', () => {
  it('gives the character, and nothing for a surrogate', () => {
    expect(characterOf(0x41)).toBe('A');
    expect(characterOf(0x1f600)).toBe('😀');
    expect(characterOf(0xd800)).toBe('');
    expect(characterOf(0x110000)).toBe('');
  });
});

describe('categories', () => {
  it('names known categories and passes unknown ones through', () => {
    expect(categoryName('Lu')).toBe('Uppercase letter');
    expect(categoryName('Nd')).toBe('Decimal number');
    expect(categoryName('Xx')).toBe('Xx');
  });

  it('accepts only real code points', () => {
    expect(isValidCodePoint(0)).toBe(true);
    expect(isValidCodePoint(MAX_CODE_POINT)).toBe(true);
    expect(isValidCodePoint(1.5)).toBe(false);
    expect(isValidCodePoint(MAX_CODE_POINT + 1)).toBe(false);
  });
});
