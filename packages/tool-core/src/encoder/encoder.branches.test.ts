import { describe, expect, it } from 'vitest';
import { decodeHex, decodeHtml, EncodingError, encodeHex, encodeHtml } from './index';

describe('decodeHtml', () => {
  it('reads named, decimal and hexadecimal entities', () => {
    expect(decodeHtml('&amp;&lt;&gt;&quot;&#39;')).toBe('&<>"\'');
    expect(decodeHtml('&#65;&#x41;&#x1F600;')).toBe('AA😀');
    expect(decodeHtml('&aacute;&eacute;')).toBe('áé');
  });

  it('leaves a reference it cannot read exactly as it was', () => {
    // Above the last code point, so it is not a character at all.
    expect(decodeHtml('&#x110000;')).toBe('&#x110000;');
    expect(decodeHtml('&#99999999;')).toBe('&#99999999;');
    expect(decodeHtml('&notanentity;')).toBe('&notanentity;');
  });

  it('ignores a bare ampersand', () => {
    expect(decodeHtml('fish & chips')).toBe('fish & chips');
  });

  it('round-trips through encodeHtml', () => {
    const text = 'a < b && "c" > d';
    expect(decodeHtml(encodeHtml(text))).toBe(text);
  });
});

describe('decodeHex', () => {
  it('reads bytes with an optional 0x prefix and any spacing', () => {
    expect(decodeHex('41')).toBe('A');
    expect(decodeHex('0x41')).toBe('A');
    expect(decodeHex('0X41')).toBe('A');
    expect(decodeHex(' 4 1 ')).toBe('A');
    expect(decodeHex('C3A9')).toBe('é');
  });

  it('returns nothing for empty input', () => {
    expect(decodeHex('')).toBe('');
    expect(decodeHex('   ')).toBe('');
  });

  it('explains what is wrong instead of guessing', () => {
    expect(() => decodeHex('zz')).toThrow(EncodingError);
    expect(() => decodeHex('zz')).toThrow('That is not valid hexadecimal');
    expect(() => decodeHex('abc')).toThrow('Hex needs an even number of digits');
  });

  it('round-trips multibyte text', () => {
    expect(decodeHex(encodeHex('héllo 😀'))).toBe('héllo 😀');
  });
});
