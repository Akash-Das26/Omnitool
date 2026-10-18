import { describe, expect, it } from 'vitest';
import {
  decodeBase64,
  decodeHex,
  decodeHtml,
  decodeUrl,
  EncodingError,
  encodeBase64,
  encodeHex,
  encodeHtml,
  encodeUrl,
} from './index';

describe('Base64', () => {
  it('matches known vectors', () => {
    expect(encodeBase64('hello')).toBe('aGVsbG8=');
    expect(decodeBase64('aGVsbG8=')).toBe('hello');
  });

  it('round-trips unicode and emoji', () => {
    for (const value of ['héllo', 'naïve café', '🌍🌏', '日本語']) {
      expect(decodeBase64(encodeBase64(value))).toBe(value);
    }
  });

  it('ignores whitespace in encoded input', () => {
    expect(decodeBase64('aGVs\nbG8=')).toBe('hello');
  });

  it('rejects invalid characters, bad padding and invalid UTF-8', () => {
    expect(() => decodeBase64('abc$')).toThrow(EncodingError);
    expect(() => decodeBase64('abc')).toThrow('padding');
    expect(() => decodeBase64('//8=')).toThrow('UTF-8');
  });

  it('treats an empty string as empty', () => {
    expect(decodeBase64('')).toBe('');
    expect(encodeBase64('')).toBe('');
  });
});

describe('URL encoding', () => {
  it('round-trips reserved characters and unicode', () => {
    const value = 'a b&c=d?é/🌍';
    expect(decodeUrl(encodeUrl(value))).toBe(value);
    expect(encodeUrl('a b')).toBe('a%20b');
  });

  it('rejects broken percent-encoding', () => {
    expect(() => decodeUrl('%E0%A4%A')).toThrow(EncodingError);
  });
});

describe('HTML entities', () => {
  it('escapes the five reserved characters', () => {
    expect(encodeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;',
    );
  });

  it('decodes named, decimal and hexadecimal entities', () => {
    expect(decodeHtml('&lt;p&gt;caf&eacute; &amp; &#233; &#x1F30D;&lt;/p&gt;')).toBe(
      '<p>café & é 🌍</p>',
    );
  });

  it('leaves unknown entities untouched', () => {
    expect(decodeHtml('&bogus; &amp;')).toBe('&bogus; &');
  });

  it('round-trips unicode text', () => {
    const value = `<p>“Quotes” & apostrophes’</p>`;
    expect(decodeHtml(encodeHtml(value))).toBe(value);
  });
});

describe('hex', () => {
  it('encodes UTF-8 bytes in lower case', () => {
    expect(encodeHex('hello')).toBe('68656c6c6f');
    expect(encodeHex('é')).toBe('c3a9');
  });

  it('decodes with whitespace and an optional prefix', () => {
    expect(decodeHex('68 65 6c 6c 6f')).toBe('hello');
    expect(decodeHex('0xC3A9')).toBe('é');
  });

  it('round-trips emoji', () => {
    expect(decodeHex(encodeHex('🌍'))).toBe('🌍');
  });

  it('rejects odd length, non-hex characters and invalid UTF-8', () => {
    expect(() => decodeHex('abc')).toThrow('even number');
    expect(() => decodeHex('zz')).toThrow('valid hexadecimal');
    expect(() => decodeHex('ff')).toThrow('UTF-8');
  });
});
