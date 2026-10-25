import { describe, expect, it } from 'vitest';
import { encodeBarcode } from './barcode/index';
import { brailleToText, textToBraille } from './braille/index';
import { evaluateExpression, formatNumber } from './calc/index';
import { englishScore, railFence } from './ciphers/index';
import { formatJson, minifyJson, scanJsonSyntax, validateJson } from './json/index';

/**
 * The error and refusal branches that the happy-path tests never touch. Each
 * one asserts the sentence a person sees, not just that something threw, so a
 * reworded message is a deliberate change rather than a silent one.
 */
describe('barcode refusals', () => {
  it('asks for text when Code 39 is empty', () => {
    const result = encodeBarcode({ symbology: 'code39', value: '' });
    expect(result).toEqual({ ok: false, error: 'Enter the text to encode.' });
  });

  it('tells ITF that it takes digits only', () => {
    expect(encodeBarcode({ symbology: 'itf', value: 'ABC' })).toEqual({
      ok: false,
      error: 'ITF takes digits only.',
    });
  });

  it('refuses a letter inside EAN-13 and says what it wanted', () => {
    const result = encodeBarcode({ symbology: 'ean13', value: '59012341234A' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a refusal');
    expect(result.error).toMatch(/digits/i);
  });

  it('gives UPC-A its own digit-count sentence', () => {
    expect(encodeBarcode({ symbology: 'upca', value: '123' })).toEqual({
      ok: false,
      error: 'UPC-A needs 11 digits, or 12 with the check digit at the end.',
    });
  });

  it('asks for text when Code 128 is empty', () => {
    expect(encodeBarcode({ symbology: 'code128', value: '' })).toEqual({
      ok: false,
      error: 'Enter the text to encode.',
    });
  });
});

describe('calculator refusals', () => {
  it('refuses a result too large to show', () => {
    expect(evaluateExpression('10^400')).toEqual({
      ok: false,
      error: 'The result is too large to show.',
    });
  });

  it('names the constant it does not know', () => {
    expect(evaluateExpression('tau')).toEqual({
      ok: false,
      error: 'Unknown name “tau”.',
    });
  });

  it('shows nothing for a value that is not a number', () => {
    expect(formatNumber(Number.NaN)).toBe('');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('');
  });

  it('ignores a previous answer that is not a number', () => {
    const result = evaluateExpression('ans+1', { ans: Number.NaN });
    expect(result).toEqual({ ok: true, value: 1, display: '1' });
  });

  it('refuses an expression nested too deeply', () => {
    const deep = `${'('.repeat(120)}1${')'.repeat(120)}`;
    const result = evaluateExpression(deep);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a refusal');
    expect(result.error).toMatch(/nested/i);
  });

  it('says a factorial has no value before it', () => {
    expect(evaluateExpression('!')).toEqual({
      ok: false,
      error: 'A value is missing before “!”.',
    });
  });
});

describe('json reading', () => {
  it('reports the early close of an array', () => {
    expect(validateJson('[1,2,]').ok).toBe(false);
    expect(scanJsonSyntax('[1,2,]')?.message).toBeTruthy();
  });

  it('formats an empty array and an empty object', () => {
    expect(formatJson('[]')).toBe('[]\n');
    expect(minifyJson('{ "a" : 1 }')).toBe('{"a":1}');
  });
});

describe('ciphers on text outside the table', () => {
  it('scores text with no Latin letters as no evidence at all', () => {
    expect(englishScore('')).toBe(-Infinity);
    expect(englishScore('12345')).toBe(-Infinity);
    expect(englishScore('Ω≈ç')).toBe(-Infinity);
  });

  it('ignores letters outside the frequency table when there are some', () => {
    expect(englishScore('hello Ω')).toBeGreaterThan(englishScore('zkzkz'));
  });

  it('decodes a rail fence that was stopped early without inventing characters', () => {
    const encoded = railFence('WE ARE DISCOVERED FLEE AT ONCE', 3, 'encode');
    expect(railFence(encoded, 3, 'decode')).toBe('WE ARE DISCOVERED FLEE AT ONCE');
    expect(railFence('', 3, 'decode')).toBe('');
  });
});

describe('braille round trip', () => {
  it('keeps the digits and letters it knows', () => {
    const result = textToBraille('Hi 42');
    expect(result.text.length).toBeGreaterThan(0);
    expect(brailleToText(result.text).text).toBe('Hi 42');
  });
});
