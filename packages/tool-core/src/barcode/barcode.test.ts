import { describe, expect, it } from 'vitest';
import { barRects, contrastRatio, encodeBarcode } from './index';

/** The L-digit width table from ISO/IEC 15420, used to decode independently. */
const EAN_L_WIDTHS = [
  [3, 2, 1, 1],
  [2, 2, 2, 1],
  [2, 1, 2, 2],
  [1, 4, 1, 1],
  [1, 1, 3, 2],
  [1, 2, 3, 1],
  [1, 1, 1, 4],
  [1, 3, 1, 2],
  [1, 2, 1, 3],
  [3, 1, 1, 2],
];

/**
 * Decodes a seven-module EAN digit into its four element widths. Digits are
 * parsed as [space, bar, space, bar] so the same table covers L, G and R.
 */
/** The widths of the runs of identical modules in a seven-module digit. */
function eanDigitWidths(seven: string): number[] {
  const widths: number[] = [];
  let previous = seven[0] as string;
  let run = 0;
  for (const module of seven) {
    if (module === previous) {
      run += 1;
    } else {
      widths.push(run);
      previous = module;
      run = 1;
    }
  }
  widths.push(run);
  return widths;
}

/** The lengths of the runs of identical modules in a string. */
function runs(modules: string): number[] {
  const lengths: number[] = [];
  let previous = modules[0] as string;
  let run = 0;
  for (const module of modules) {
    if (module === previous) {
      run += 1;
    } else {
      lengths.push(run);
      previous = module;
      run = 1;
    }
  }
  lengths.push(run);
  return lengths;
}

function sameWidths(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

describe('Code 128', () => {
  it('expands the published width patterns to the published module strings', () => {
    // ISO/IEC 15417 worked examples for value 0, 1, Start A and Stop.
    const symbol = (value: string, start: number) => {
      const modules: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        modules.push((start % 2 === 0 ? '1' : '0').repeat(Number(value[index])));
        start += 1;
      }
      return modules.join('');
    };
    expect(symbol('212222', 0)).toBe('11011001100');
    expect(symbol('222122', 0)).toBe('11001101100');
    expect(symbol('211412', 0)).toBe('11010000100');
    expect(symbol('2331112', 0)).toBe('1100011101011');
  });

  it('matches the worked modulo-103 example from the standard’s literature', async () => {
    const { code128Checksum } = await import('./index');
    // "PJJ123C" in code set A: start 103, then 48, 42, 42, 17, 18, 19, 35.
    expect(code128Checksum(103, [48, 42, 42, 17, 18, 19, 35])).toBe(54);
  });

  it('encodes text as start, data, check symbol and stop', () => {
    const result = encodeBarcode({ symbology: 'code128', value: 'X00Y' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 6 symbols plus the stop (13 modules) at 11 modules each.
    expect(result.modules).toHaveLength(11 * 6 + 13);
    expect(result.modules.endsWith('1100011101011')).toBe(true);
    expect(result.checkDigit?.computed).toBe(true);
    expect(result.symbol.startsWith('0'.repeat(10))).toBe(true);
  });

  it('uses code set C for an even run of digits and says so', () => {
    const result = encodeBarcode({ symbology: 'code128', value: '123456' });
    expect(result.ok && result.notes[0]).toMatch(/code set C/);
    const text = encodeBarcode({ symbology: 'code128', value: '12345' });
    expect(text.ok && text.notes[0]).toMatch(/Code set B/);
  });

  it('refuses characters outside printable ASCII', () => {
    const result = encodeBarcode({ symbology: 'code128', value: 'café' });
    expect(result).toEqual({
      ok: false,
      error: 'Code 128 here encodes printable ASCII only; “é” cannot be encoded.',
    });
  });
});

describe('EAN-13 and UPC-A', () => {
  it('encodes a published EAN-13 and decodes back through the ISO width table', () => {
    const result = encodeBarcode({ symbology: 'ean13', value: '5901234123457' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.modules).toHaveLength(95);
    expect(result.modules.slice(0, 3)).toBe('101');
    expect(result.modules.slice(45, 50)).toBe('01010');
    expect(result.modules.slice(-3)).toBe('101');
    expect(result.text).toBe('5901234123457');
    expect(result.checkDigit).toMatchObject({ digit: '7', computed: false });
  });

  it('computes the check digit for 12 digits and explains it', () => {
    const result = encodeBarcode({ symbology: 'ean13', value: '590123412345' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toBe('5901234123457');
    expect(result.checkDigit?.computed).toBe(true);
    expect(result.checkDigit?.explanation).toContain('sum is 83');
  });

  it('rejects a wrong check digit and names the right one', () => {
    const result = encodeBarcode({ symbology: 'ean13', value: '5901234123456' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('check digit is 7, not 6');
  });

  it('rejects the wrong number of digits', () => {
    expect(encodeBarcode({ symbology: 'ean13', value: '1234' })).toEqual({
      ok: false,
      error: 'EAN-13 needs 12 digits, or 13 with the check digit at the end.',
    });
  });

  it('encodes UPC-A digits with the UPC guard structure', () => {
    const result = encodeBarcode({ symbology: 'upca', value: '036000291452' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.modules).toHaveLength(95);
    expect(result.symbol).toHaveLength(115);
    expect(Number(result.text.at(-1))).toBe(2);
    expect(result.checkDigit).toMatchObject({ digit: '2', computed: false });
  });

  it('computes the UPC-A check digit for 11 digits', () => {
    const result = encodeBarcode({ symbology: 'upca', value: '03600029145' });
    expect(result.ok && result.text).toBe('036000291452');
  });

  it('reads every left-hand digit back with the ISO width table', () => {
    const result = encodeBarcode({ symbology: 'ean13', value: '5901234123457' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // First digit 5 selects the parity LGGLLG, so digits 1-6 use those sets.
    const parity = 'LGGLLG';
    const left = result.modules.slice(3, 45);
    for (let index = 0; index < 6; index += 1) {
      const digit = Number(result.text[index + 1]);
      const seven = left.slice(index * 7, index * 7 + 7);
      const widths = eanDigitWidths(seven);
      const expected =
        parity[index] === 'G'
          ? [...(EAN_L_WIDTHS[digit] as number[])].reverse()
          : (EAN_L_WIDTHS[digit] as number[]);
      expect(sameWidths(widths, expected), `digit ${digit} in ${seven}`).toBe(true);
    }
  });
});

describe('Code 39', () => {
  it('encodes the published patterns for 0 and the start/stop character', () => {
    const zero = encodeBarcode({ symbology: 'code39', value: '0', wideRatio: 2 });
    expect(zero.ok).toBe(true);
    if (!zero.ok) return;
    // ISO/IEC 16388: * 0 *
    expect(zero.modules).toBe('100101101101' + '0' + '101001101101' + '0' + '100101101101');
  });

  it('gives every character exactly three wide elements out of nine', () => {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
    for (const character of alphabet) {
      const result = encodeBarcode({ symbology: 'code39', value: character, wideRatio: 3 });
      expect(result.ok, character).toBe(true);
      if (!result.ok) continue;
      // The start character is 15 modules, then one narrow separator, so the
      // data character begins at 16 and is nine elements long.
      const body = result.modules.slice(16, 31);
      expect(body, character).toHaveLength(15);
      const elements = runs(body);
      expect(elements, character).toHaveLength(9);
      expect(
        elements.filter((width) => width === 3),
        character,
      ).toHaveLength(3);
    }
  });

  it('upper-cases the text and says that it did', () => {
    const result = encodeBarcode({ symbology: 'code39', value: 'ab-1' });
    expect(result.ok && result.text).toBe('AB-1');
    expect(result.ok && result.notes.join(' ')).toMatch(/upper case/);
  });

  it('refuses a character outside the alphabet', () => {
    const result = encodeBarcode({ symbology: 'code39', value: 'a_b' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('“_”');
  });
});

describe('ITF', () => {
  it('interleaves a bar digit with a space digit', () => {
    const result = encodeBarcode({ symbology: 'itf', value: '12', wideRatio: 3 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Start 1010, then digit 1 (10001) in bars and 2 (01001) in spaces.
    // Wide elements are three modules; the pair is 18 modules wide.
    expect(result.modules.startsWith('1010')).toBe(true);
    expect(result.modules.endsWith('11101')).toBe(true);
    expect(result.text).toBe('12');
  });

  it('pads an odd count with a leading zero and says so', () => {
    const result = encodeBarcode({ symbology: 'itf', value: '123' });
    expect(result.ok && result.text).toBe('0123');
    expect(result.ok && result.notes[0]).toMatch(/leading zero/);
  });

  it('refuses anything that is not a digit', () => {
    expect(encodeBarcode({ symbology: 'itf', value: '12a' })).toEqual({
      ok: false,
      error: 'ITF takes digits only.',
    });
  });
});

describe('rendering helpers', () => {
  it('turns a module string into bar rectangles', () => {
    expect(barRects('001110010')).toEqual([
      { x: 2, width: 3 },
      { x: 7, width: 1 },
    ]);
  });

  it('computes the WCAG contrast ratio of two colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // Ink on Paper, the tool's default pair.
    expect(contrastRatio('#101828', '#EDF0F3')).toBeGreaterThan(7);
  });
});
