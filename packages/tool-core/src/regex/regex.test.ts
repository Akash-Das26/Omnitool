import { describe, expect, it } from 'vitest';
import { MAX_MATCHES, runRegex, validateFlags } from './index';

describe('validateFlags', () => {
  it('accepts the supported flags once each', () => {
    expect(validateFlags('')).toBeNull();
    expect(validateFlags('ims u'.replace(' ', ''))).toBeNull();
  });

  it('rejects unknown and duplicated flags', () => {
    expect(validateFlags('g')).toContain('not one of the flags');
    expect(validateFlags('ii')).toContain('more than once');
  });
});

describe('runRegex', () => {
  it('finds every match with its position', () => {
    const result = runRegex('\\d+', '', 'a1 bb22 c333');
    expect(result.error).toBeUndefined();
    expect(result.matches.map((match) => match.value)).toEqual(['1', '22', '333']);
    expect(result.matches.map((match) => match.index)).toEqual([1, 5, 9]);
    expect(result.truncated).toBe(false);
  });

  it('reports capture groups and named groups', () => {
    const result = runRegex('(?<year>\\d{4})-(\\d{2})', '', 'on 2026-10 and 2025-01');
    expect(result.matches).toHaveLength(2);
    expect(result.matches[0]?.groups).toEqual([
      { name: 'year', value: '2026' },
      { name: null, value: '10' },
    ]);
  });

  it('honours the i, m and s flags', () => {
    expect(runRegex('hello', 'i', 'HELLO hello').matches).toHaveLength(2);
    expect(runRegex('^b$', 'm', 'a\nb\nc').matches.map((match) => match.value)).toEqual(['b']);
    expect(runRegex('a.b', 's', 'a\nb').matches).toHaveLength(1);
    expect(runRegex('a.b', '', 'a\nb').matches).toHaveLength(0);
  });

  it('handles unicode with the u flag and code points without it', () => {
    expect(runRegex('\\p{L}+', 'u', 'héllo wörld').matches.map((match) => match.value)).toEqual([
      'héllo',
      'wörld',
    ]);
  });

  it('returns a readable error for an invalid pattern or flag', () => {
    const badPattern = runRegex('([a-z', '', 'abc');
    expect(badPattern.matches).toEqual([]);
    expect(badPattern.error).toBeTruthy();
    expect(badPattern.error?.length).toBeGreaterThan(5);

    const badFlag = runRegex('a', 'q', 'abc');
    expect(badFlag.error).toContain('q');

    const empty = runRegex('', '', 'abc');
    expect(empty.error).toContain('pattern');
  });

  it('makes progress on zero-length matches', () => {
    const result = runRegex('a*', '', 'bbb');
    expect(result.matches).toHaveLength(4);
    expect(result.matches.every((match) => match.length === 0)).toBe(true);
    expect(result.matches.map((match) => match.index)).toEqual([0, 1, 2, 3]);
  });

  it('caps the number of matches and says so only when more exist', () => {
    const capped = runRegex('a', '', 'aaaa', { maxMatches: 2 });
    expect(capped.matches).toHaveLength(2);
    expect(capped.truncated).toBe(true);

    const exact = runRegex('a', '', 'aa', { maxMatches: 2 });
    expect(exact.matches).toHaveLength(2);
    expect(exact.truncated).toBe(false);
  });

  it('has a default cap', () => {
    const text = 'a'.repeat(MAX_MATCHES + 50);
    const result = runRegex('a', '', text);
    expect(result.matches).toHaveLength(MAX_MATCHES);
    expect(result.truncated).toBe(true);
  });
});
