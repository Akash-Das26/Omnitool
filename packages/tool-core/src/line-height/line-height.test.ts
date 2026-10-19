import { describe, expect, it } from 'vitest';
import {
  baselineTable,
  fromBaseline,
  fromRatio,
  LineHeightError,
  WCAG_MIN_LINE_HEIGHT,
} from './index';

describe('fromRatio', () => {
  it('turns a ratio into px, rem and a unitless line height', () => {
    expect(fromRatio(16, 1.5)).toEqual({
      unitless: 1.5,
      px: 24,
      rem: 1.5,
      wcagNote: null,
    });
  });

  it('follows a custom root size', () => {
    const result = fromRatio(16, 1.5, 10);
    expect(result.px).toBe(24);
    expect(result.rem).toBe(2.4);
  });

  it('flags line heights below the WCAG text-spacing minimum', () => {
    expect(WCAG_MIN_LINE_HEIGHT).toBe(1.5);
    expect(fromRatio(16, 1.4).wcagNote).toContain('1.5');
    expect(fromRatio(16, 1.2).wcagNote).not.toBeNull();
    expect(fromRatio(16, 2).wcagNote).toBeNull();
  });

  it('rounds the unitless value to four places', () => {
    expect(fromRatio(16, 1.3333).unitless).toBe(1.3333);
    expect(fromRatio(18, 1.333).px).toBe(23.994);
  });

  it('rejects invalid sizes and ratios', () => {
    expect(() => fromRatio(0, 1.5)).toThrow(LineHeightError);
    expect(() => fromRatio(16, 0)).toThrow('greater than zero');
    expect(() => fromRatio(Number.NaN, 1.5)).toThrow(LineHeightError);
    expect(() => fromRatio(16, 1.5, 0)).toThrow('Root font size');
  });
});

describe('fromBaseline', () => {
  it('snaps up to the next baseline multiple that meets the minimum', () => {
    const result = fromBaseline(16, 8);
    expect(result.multiples).toBe(3);
    expect(result.px).toBe(24);
    expect(result.unitless).toBe(1.5);
    expect(result.rem).toBe(1.5);
    expect(result.wcagNote).toBeNull();
  });

  it('uses the next multiple when the minimum falls between lines', () => {
    const result = fromBaseline(16, 10);
    expect(result.multiples).toBe(3);
    expect(result.px).toBe(30);
    expect(result.unitless).toBe(1.875);
  });

  it('honours a stricter minimum but still notes WCAG', () => {
    const result = fromBaseline(16, 8, 16, 1.6);
    expect(result.multiples).toBe(4);
    expect(result.px).toBe(32);
    expect(result.unitless).toBe(2);
    expect(fromBaseline(16, 8, 16, 1.2).wcagNote).toBeNull();
  });

  it('rejects invalid input', () => {
    expect(() => fromBaseline(16, 0)).toThrow('Baseline must be');
    expect(() => fromBaseline(-1, 8)).toThrow(LineHeightError);
    expect(() => fromBaseline(16, 8, -1)).toThrow(LineHeightError);
  });
});

describe('baselineTable', () => {
  it('gives one row per font size', () => {
    const rows = baselineTable([14, 16, 18], 8);
    expect(rows.map((row) => row.fontSizePx)).toEqual([14, 16, 18]);
    expect(rows.map((row) => row.multiples)).toEqual([3, 3, 4]);
    expect(rows.map((row) => row.px)).toEqual([24, 24, 32]);
  });

  it('rejects an invalid baseline', () => {
    expect(() => baselineTable([16], 0)).toThrow(LineHeightError);
  });
});
