import { describe, expect, it } from 'vitest';
import {
  COMMON_PX_VALUES,
  conversionTable,
  DEFAULT_ROOT_FONT_SIZE,
  LengthConversionError,
  pxToRem,
  remToPx,
  roundTo,
} from './index';

describe('pxToRem', () => {
  it('uses a 16 px root by default', () => {
    expect(DEFAULT_ROOT_FONT_SIZE).toBe(16);
    expect(pxToRem(16)).toBe(1);
    expect(pxToRem(24)).toBe(1.5);
    expect(pxToRem(1)).toBe(0.0625);
  });

  it('honours a custom root size', () => {
    expect(pxToRem(24, 10)).toBe(2.4);
    expect(pxToRem(14, 14)).toBe(1);
  });

  it('rounds to four decimal places', () => {
    expect(pxToRem(1, 3)).toBe(0.3333);
  });

  it('rejects invalid numbers and root sizes', () => {
    expect(() => pxToRem(Number.NaN)).toThrow(LengthConversionError);
    expect(() => pxToRem(16, 0)).toThrow('greater than zero');
    expect(() => pxToRem(16, Number.POSITIVE_INFINITY)).toThrow('greater than zero');
  });
});

describe('remToPx', () => {
  it('multiplies by the root size', () => {
    expect(remToPx(1)).toBe(16);
    expect(remToPx(1.25)).toBe(20);
    expect(remToPx(2, 10)).toBe(20);
  });

  it('rejects invalid input', () => {
    expect(() => remToPx(Number.NaN)).toThrow('number of rem units');
    expect(() => remToPx(1, -2)).toThrow('greater than zero');
  });
});

describe('conversionTable', () => {
  it('covers the common pixel values', () => {
    const rows = conversionTable();
    expect(rows).toHaveLength(COMMON_PX_VALUES.length);
    expect(rows.find((row) => row.px === 16)?.rem).toBe(1);
  });

  it('follows a custom root size', () => {
    const rows = conversionTable(10);
    expect(rows.find((row) => row.px === 20)?.rem).toBe(2);
  });

  it('rejects an invalid root size', () => {
    expect(() => conversionTable(0)).toThrow(LengthConversionError);
  });
});

describe('roundTo', () => {
  it('rounds to the requested precision', () => {
    expect(roundTo(1.23456, 2)).toBe(1.23);
    expect(roundTo(1.2345, 3)).toBe(1.235);
    expect(roundTo(2.5)).toBe(2.5);
  });
});
