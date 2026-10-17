import { describe, expect, it } from 'vitest';
import { parseSearchParams, toSearchParams, validateSharedSearch } from './search-params';

describe('validateSharedSearch', () => {
  it('accepts known params', () => {
    expect(
      validateSharedSearch({
        category: 'colour',
        color: '#2447f5',
        run: '9f8d7c6b-5a49-4382-9170-6f5e4d3c2b1a',
        q: 'qr',
      }),
    ).toEqual({
      category: 'colour',
      color: '#2447f5',
      run: '9f8d7c6b-5a49-4382-9170-6f5e4d3c2b1a',
      q: 'qr',
    });
  });

  it('drops invalid values instead of throwing', () => {
    expect(validateSharedSearch({ category: 'nope', color: 'red', q: 'x'.repeat(81) })).toEqual({});
  });

  it('drops unknown keys, including file payloads', () => {
    expect(
      validateSharedSearch({
        category: 'img-assets',
        file: 'data:image/png;base64,AAAA',
        data: 'AAAA',
        blob: 'x',
      }),
    ).toEqual({ category: 'img-assets' });
  });

  it('ignores non-string values', () => {
    expect(validateSharedSearch({ category: 42, q: { nested: true } })).toEqual({});
  });
});

describe('toSearchParams', () => {
  it('serialises only allow-listed values', () => {
    const params = toSearchParams({
      category: 'pdf',
      q: 'compress',
      // Deliberate probe: URL state must never carry file data.
      file: 'AAAA',
    } as never);

    expect(params.toString()).toBe('category=pdf&q=compress');
  });

  it('omits empty values', () => {
    expect(toSearchParams({ q: '' }).toString()).toBe('');
  });
});

describe('parseSearchParams', () => {
  it('keeps valid params and strips unknown ones', () => {
    const params = new URLSearchParams(
      'category=dev-tools&data=AAAA&color=%232447f5&run=nope&file=x',
    );
    expect(parseSearchParams(params)).toEqual({ category: 'dev-tools', color: '#2447f5' });
  });
});
