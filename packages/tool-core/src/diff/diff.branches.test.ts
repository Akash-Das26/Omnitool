import { describe, expect, it } from 'vitest';
import {
  DiffError,
  diffText,
  diffTokens,
  MAX_DIFF_TOKENS,
  mergeSteps,
  tokenize,
  toRows,
} from './index';

describe('tokenize', () => {
  it('returns nothing for empty text in every mode', () => {
    expect(tokenize('', 'line')).toEqual([]);
    expect(tokenize('', 'word')).toEqual([]);
    expect(tokenize('', 'character')).toEqual([]);
  });

  it('keeps the line ending with its line in line mode', () => {
    expect(tokenize('a\nb', 'line')).toEqual(['a\n', 'b']);
  });

  it('separates words, spaces and punctuation in word mode', () => {
    expect(tokenize('Hi, there!', 'word')).toEqual(['Hi', ',', ' ', 'there', '!']);
  });

  it('counts Unicode characters, not UTF-16 units', () => {
    expect(tokenize('a😀', 'character')).toEqual(['a', '😀']);
  });
});

describe('diffTokens', () => {
  it('reports one insertion per token when the first side is empty', () => {
    expect(diffTokens([], ['a', 'b'])).toEqual([
      { type: 'insert', token: 'a' },
      { type: 'insert', token: 'b' },
    ]);
  });

  it('reports one deletion per token when the second side is empty', () => {
    expect(diffTokens(['a'], [])).toEqual([{ type: 'delete', token: 'a' }]);
  });

  it('says so when the two sides differ too much to compare', () => {
    expect(() => diffTokens(['a', 'b', 'c'], ['x', 'y', 'z'], 1)).toThrow(DiffError);
    expect(() => diffTokens(['a', 'b', 'c'], ['x', 'y', 'z'], 1)).toThrow(/differ too much/);
  });
});

describe('diffText', () => {
  it('limits each side and says which limit was hit', () => {
    const long = 'a\n'.repeat(MAX_DIFF_TOKENS + 1);
    expect(() => diffText(long, 'b', 'line')).toThrow(/limited to 20,000 units per side/);
  });

  it('counts additions, deletions and unchanged units', () => {
    const result = diffText('one\ntwo\nthree', 'one\nTWO\nthree\nfour', 'line');
    // `two` and `three` each change, and `four` is new: three insertions and
    // two deletions, with `one` the only untouched line.
    expect(result.additions).toBe(3);
    expect(result.deletions).toBe(2);
    expect(result.unchanged).toBe(1);
    expect(result.parts.map((part) => part.type)).toContain('equal');
  });
});

describe('mergeSteps', () => {
  it('joins neighbouring steps of the same kind', () => {
    expect(
      mergeSteps([
        { type: 'equal', token: 'a' },
        { type: 'equal', token: 'b' },
        { type: 'delete', token: 'c' },
        { type: 'insert', token: 'd' },
      ]),
    ).toEqual([
      { type: 'equal', value: 'ab' },
      { type: 'delete', value: 'c' },
      { type: 'insert', value: 'd' },
    ]);
  });

  it('returns nothing for no steps', () => {
    expect(mergeSteps([])).toEqual([]);
  });
});

describe('toRows', () => {
  it('puts unchanged text on both sides', () => {
    expect(toRows([{ type: 'equal', value: 'same' }])).toEqual([
      { left: 'same', right: 'same', kind: 'equal' },
    ]);
  });

  it('pairs a replacement as a change row', () => {
    expect(
      toRows([
        { type: 'delete', value: 'old' },
        { type: 'insert', value: 'new' },
      ]),
    ).toEqual([{ left: 'old', right: 'new', kind: 'change' }]);
  });

  it('leaves the missing side empty for a one-sided change', () => {
    expect(toRows([{ type: 'delete', value: 'gone' }])).toEqual([
      { left: 'gone', right: null, kind: 'delete' },
    ]);
    expect(toRows([{ type: 'insert', value: 'new' }])).toEqual([
      { left: null, right: 'new', kind: 'insert' },
    ]);
  });

  it('aligns a longer replacement block row by row', () => {
    const rows = toRows([
      { type: 'delete', value: 'a' },
      { type: 'insert', value: 'x' },
      { type: 'insert', value: 'y' },
      { type: 'equal', value: 'z' },
    ]);
    expect(rows).toEqual([
      { left: 'a', right: 'x', kind: 'change' },
      { left: null, right: 'y', kind: 'insert' },
      { left: 'z', right: 'z', kind: 'equal' },
    ]);
  });
});
