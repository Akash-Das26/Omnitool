import { describe, expect, it } from 'vitest';
import { BaseConversionError, convertBase, formatInBase, parseInBase } from './index';

describe('convertBase', () => {
  it('converts between common bases', () => {
    expect(convertBase('255', 10, 16)).toBe('FF');
    expect(convertBase('ff', 16, 10)).toBe('255');
    expect(convertBase('11111111', 2, 16)).toBe('FF');
    expect(convertBase('777', 8, 2)).toBe('111111111');
    expect(convertBase('Z', 36, 10)).toBe('35');
  });

  it('keeps precision beyond Number.MAX_SAFE_INTEGER', () => {
    const value = 2n ** 100n;
    expect(convertBase(value.toString(), 10, 16)).toBe('10000000000000000000000000');
    expect(parseInBase('10000000000000000000000000', 16)).toBe(value);
  });

  it('handles signs, whitespace and zero', () => {
    expect(convertBase('  -1010  ', 2, 10)).toBe('-10');
    expect(convertBase('+10', 10, 2)).toBe('1010');
    expect(convertBase('0', 10, 36)).toBe('0');
    expect(convertBase('-0', 10, 2)).toBe('0');
  });

  it('round-trips through base 36', () => {
    const encoded = convertBase('12345678901234567890', 10, 36);
    expect(convertBase(encoded, 36, 10)).toBe('12345678901234567890');
  });

  it('reports an invalid digit with the allowed range', () => {
    expect(() => convertBase('2', 2, 10)).toThrow(BaseConversionError);
    expect(() => convertBase('2', 2, 10)).toThrow('"2" is not a valid digit in base 2 (use 0-1)');
    expect(() => convertBase('G', 16, 10)).toThrow('0-9 and A-F');
  });

  it('rejects fractional, empty and out-of-range input', () => {
    expect(() => convertBase('1.5', 10, 2)).toThrow('whole numbers');
    expect(() => convertBase('   ', 10, 2)).toThrow('Enter a value');
    expect(() => convertBase('-', 10, 2)).toThrow('after the sign');
    expect(() => parseInBase('10', 1)).toThrow('between 2 and 36');
    expect(() => parseInBase('10', 37)).toThrow('between 2 and 36');
    expect(() => formatInBase(10n, 2.5)).toThrow('between 2 and 36');
  });
});

describe('formatInBase', () => {
  it('uses upper-case digits above nine', () => {
    expect(formatInBase(35n, 36)).toBe('Z');
    expect(formatInBase(255n, 16)).toBe('FF');
  });
});
